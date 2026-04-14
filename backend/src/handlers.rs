use std::sync::Arc;

use axum::extract::{Query, State};
use axum::response::{IntoResponse, Response};
use axum::Json;
use axum::http::header;
use serde::{Deserialize, Serialize};
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;

use crate::index::{AvailableBand, DomainIndex, SearchParams, SearchResult, SortMode};

pub struct AppState {
    pub index: Arc<DomainIndex>,
    /// Snapshot file mtime as unix milliseconds. Shown to users so they know
    /// how stale the availability data is.
    pub snapshot_updated_at_ms: i64,
}

// ─── /search (paginated REST) ──────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub tlds: Option<String>,
    pub lengths: Option<String>,
    pub available: Option<String>,
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

// ─── /tlds (ranked TLD list) ──────────────────────────────────────────

pub async fn tlds_handler(State(state): State<Arc<AppState>>) -> Json<Vec<String>> {
    Json(state.index.all_tlds().to_vec())
}

// ─── /tlds-for (paginated TLDs available for a single name) ──────────

#[derive(Debug, Deserialize)]
pub struct TldsForQuery {
    pub name: String,
    pub offset: Option<usize>,
    pub limit: Option<usize>,
}

#[derive(Serialize)]
pub struct TldsForResponse {
    pub name: String,
    pub total: usize,
    pub tlds: Vec<String>,
}

pub async fn tlds_for_handler(
    State(state): State<Arc<AppState>>,
    Query(query): Query<TldsForQuery>,
) -> Json<TldsForResponse> {
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(100).min(500);

    let (total, tlds) = state
        .index
        .tlds_for(&query.name, offset, limit)
        .unwrap_or((0, Vec::new()));

    Json(TldsForResponse {
        name: query.name,
        total,
        tlds,
    })
}

// ─── /stats (snapshot metadata) ────────────────────────────────────────

#[derive(Serialize)]
pub struct StatsResponse {
    pub updated_at_ms: i64,
    pub tld_count: usize,
}

pub async fn stats_handler(State(state): State<Arc<AppState>>) -> Json<StatsResponse> {
    Json(StatsResponse {
        updated_at_ms: state.snapshot_updated_at_ms,
        tld_count: state.index.all_tlds().len(),
    })
}

// ─── Shared param parsing ──────────────────────────────────────────────

fn parse_search_params(query: &SearchQuery) -> SearchParams {
    let tlds: Option<Vec<String>> = query.tlds.as_ref().map(|t| {
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

    let raw_q = query
        .q
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    // If query contains a dot, split into word + TLD prefix
    // e.g. "flux.dev" → word="flux", tld_prefix=".dev"
    // e.g. "helmet.a" → word="helmet", tld_prefix=".a" (matches .aarp, .app, etc.)
    let q;
    let mut tld_prefix: Option<String> = None;
    if let Some(raw) = raw_q {
        if let Some(dot_pos) = raw.find('.') {
            let word_part = &raw[..dot_pos];
            let tld_part = &raw[dot_pos..]; // includes the dot

            q = if word_part.is_empty() {
                None
            } else {
                Some(word_part.to_string())
            };

            if tld_part.len() > 1 {
                tld_prefix = Some(tld_part.to_string());
            }
        } else {
            q = Some(raw);
        }
    } else {
        q = None;
    }

    let available_band = query.available.as_deref().and_then(|v| match v {
        "1" => Some(AvailableBand::Single),
        "2-3" => Some(AvailableBand::Few),
        "4+" => Some(AvailableBand::Many),
        _ => None,
    });

    SearchParams {
        query: q,
        tlds,
        tld_prefix,
        lengths,
        available_band,
        sort,
    }
}
