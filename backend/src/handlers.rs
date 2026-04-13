use std::sync::Arc;

use axum::extract::{Query, State};
use axum::response::{IntoResponse, Response};
use axum::Json;
use axum::http::header;
use serde::{Deserialize, Serialize};
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

use crate::index::{DomainIndex, SearchParams, SearchResult, SortMode};

pub struct AppState {
    pub index: Arc<DomainIndex>,
}

// ─── /search (paginated REST) ──────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub tlds: Option<String>,
    pub lengths: Option<String>,
    pub sort: Option<String>,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
}

#[derive(Serialize)]
pub struct SearchResponse {
    pub total: usize,
    pub results: Vec<SearchResult>,
}

pub async fn search_handler(
    State(state): State<Arc<AppState>>,
    Query(query): Query<SearchQuery>,
) -> Json<SearchResponse> {
    let params = parse_search_params(&query);
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(50).min(200);

    let (total, results) = state.index.search(&params, offset, limit);

    Json(SearchResponse { total, results })
}

// ─── /stream (NDJSON) ──────────────────────────────────────────────────

pub async fn stream_handler(
    State(state): State<Arc<AppState>>,
    Query(query): Query<SearchQuery>,
) -> Response {
    let params = parse_search_params(&query);
    let index = state.index.clone();

    let (tx, rx) = tokio::sync::mpsc::channel::<SearchResult>(64);

    tokio::task::spawn_blocking(move || {
        for result in index.search_iter(&params) {
            if tx.blocking_send(result).is_err() {
                break; // receiver dropped = client disconnected
            }
        }
    });

    let stream = ReceiverStream::new(rx).map(|result| {
        let mut line = serde_json::to_string(&result).unwrap_or_default();
        line.push('\n');
        Ok::<_, std::convert::Infallible>(line)
    });

    let body = axum::body::Body::from_stream(stream);

    Response::builder()
        .header(header::CONTENT_TYPE, "application/x-ndjson")
        .header(header::CACHE_CONTROL, "no-cache")
        .body(body)
        .unwrap()
        .into_response()
}

// ─── Shared param parsing ──────────────────────────────────────────────

fn parse_search_params(query: &SearchQuery) -> SearchParams {
    let tlds = query.tlds.as_ref().map(|t| {
        t.split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    });

    let lengths = query.lengths.as_ref().map(|l| {
        l.split(',')
            .filter_map(|s| s.trim().parse::<usize>().ok())
            .collect()
    });

    let sort = match query.sort.as_deref() {
        Some("tlds") => SortMode::Tlds,
        Some("shortest") => SortMode::Shortest,
        _ => SortMode::Alpha,
    };

    let q = query
        .q
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    SearchParams {
        query: q,
        tlds,
        lengths,
        sort,
    }
}
