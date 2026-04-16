use std::sync::Arc;

use axum::Json;
use axum::extract::{Query, State};
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio_stream::StreamExt;
use tokio_stream::wrappers::ReceiverStream;

use crate::index::{AvailableBand, DomainIndex, SearchParams, SearchResult, SortMode};
use crate::state::{AppState, BatchStatus, Phase};

fn load_index(state: &AppState) -> Result<Arc<DomainIndex>, Response> {
    match state.index.load_full() {
        Some(idx) => Ok(idx),
        None => {
            let body = Json(json!({
                "status": "warming_up",
                "message": "index not loaded yet; first batch in progress"
            }));
            Err((StatusCode::SERVICE_UNAVAILABLE, body).into_response())
        }
    }
}

// ─── /search (paginated REST) ──────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: Option<String>,
    pub tlds: Option<String>,
    pub lengths: Option<String>,
    pub available: Option<String>,
    pub sort: Option<String>,
    pub seed: Option<u64>,
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
) -> Response {
    let index = match load_index(&state) {
        Ok(i) => i,
        Err(resp) => return resp,
    };
    let params = parse_search_params(&query);
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(50).min(200);

    let (total, results) = index.search(&params, offset, limit);
    Json(SearchResponse { total, results }).into_response()
}

// ─── /stream (NDJSON) ──────────────────────────────────────────────────

pub async fn stream_handler(
    State(state): State<Arc<AppState>>,
    Query(query): Query<SearchQuery>,
) -> Response {
    let index = match load_index(&state) {
        Ok(i) => i,
        Err(resp) => return resp,
    };
    let params = parse_search_params(&query);

    let (tx, rx) = tokio::sync::mpsc::channel::<SearchResult>(64);

    tokio::task::spawn_blocking(move || {
        for result in index.search_iter(&params) {
            if tx.blocking_send(result).is_err() {
                break;
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

// ─── /tlds ─────────────────────────────────────────────────────────────

pub async fn tlds_handler(State(state): State<Arc<AppState>>) -> Response {
    let index = match load_index(&state) {
        Ok(i) => i,
        Err(resp) => return resp,
    };
    Json(index.all_tlds().to_vec()).into_response()
}

// ─── /tlds-for ─────────────────────────────────────────────────────────

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
) -> Response {
    let index = match load_index(&state) {
        Ok(i) => i,
        Err(resp) => return resp,
    };
    let offset = query.offset.unwrap_or(0);
    let limit = query.limit.unwrap_or(100).min(500);

    let (total, tlds) = index
        .tlds_for(&query.name, offset, limit)
        .unwrap_or((0, Vec::new()));

    Json(TldsForResponse {
        name: query.name,
        total,
        tlds,
    })
    .into_response()
}

// ─── /health (liveness) ────────────────────────────────────────────────

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: &'static str,
    pub version: &'static str,
}

pub async fn health_handler() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    })
}

// ─── /ready (readiness: index loaded) ──────────────────────────────────

pub async fn ready_handler(State(state): State<Arc<AppState>>) -> Response {
    if state.index.load().is_some() {
        (StatusCode::OK, Json(json!({ "ready": true }))).into_response()
    } else {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({ "ready": false, "reason": "index not loaded" })),
        )
            .into_response()
    }
}

// ─── /stats ────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct StatsResponse {
    pub updated_at_ms: i64,
    pub tld_count: usize,
    pub entries: usize,
    pub total_available: usize,
    pub index_loaded: bool,
    pub snapshot_age_seconds: Option<i64>,
    pub batch: BatchStatusView,
}

#[derive(Serialize)]
pub struct BatchStatusView {
    pub phase: Phase,
    pub last_success_at_ms: Option<i64>,
    pub last_attempt_at_ms: Option<i64>,
    pub last_error: Option<String>,
    pub snapshot_updated_at_ms: Option<i64>,
    pub consecutive_failures: u32,
    pub next_scheduled_run_ms: Option<i64>,
}

pub async fn stats_handler(State(state): State<Arc<AppState>>) -> Json<StatsResponse> {
    let status: BatchStatus = (**state.batch.load()).clone();
    let (tld_count, entries, total_available, index_loaded) = match state.index.load_full() {
        Some(idx) => (idx.all_tlds().len(), idx.entries_len(), idx.total_available(), true),
        None => (0, 0, 0, false),
    };
    let now_ms = chrono::Utc::now().timestamp_millis();
    let snapshot_age_seconds = status
        .snapshot_updated_at_ms
        .map(|t| (now_ms - t) / 1000);

    Json(StatsResponse {
        updated_at_ms: status.snapshot_updated_at_ms.unwrap_or(0),
        tld_count,
        entries,
        total_available,
        index_loaded,
        snapshot_age_seconds,
        batch: BatchStatusView {
            phase: status.phase,
            last_success_at_ms: status.last_success_at_ms,
            last_attempt_at_ms: status.last_attempt_at_ms,
            last_error: status.last_error,
            snapshot_updated_at_ms: status.snapshot_updated_at_ms,
            consecutive_failures: status.consecutive_failures,
            next_scheduled_run_ms: status.next_scheduled_run_ms,
        },
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
        Some("random") => SortMode::Random(query.seed.unwrap_or(0)),
        _ => SortMode::Alpha,
    };

    let raw_q = query
        .q
        .as_ref()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let q;
    let mut tld_prefix: Option<String> = None;
    if let Some(raw) = raw_q {
        if let Some(dot_pos) = raw.find('.') {
            let word_part = &raw[..dot_pos];
            let tld_part = &raw[dot_pos..];

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
