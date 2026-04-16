use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;

use axum::Router;
use axum::routing::get;
use tower_http::cors::CorsLayer;
use tracing::{info, warn};

use justgetdomain::categories::Categories;
use justgetdomain::config::BatchConfig;
use justgetdomain::dictionary;
use justgetdomain::handlers;
use justgetdomain::index::DomainIndex;
use justgetdomain::scheduler;
use justgetdomain::snapshot;
use justgetdomain::state::{AppState, now_ms};

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info".into()),
        )
        .init();

    let config = match BatchConfig::from_env() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("FATAL: invalid config: {e:#}");
            std::process::exit(1);
        }
    };

    info!(
        url = %config.redacted_url(),
        start_hour = config.start_hour,
        window_hours = config.window_hours,
        timezone = %config.timezone,
        stale_after_hours = config.stale_after_hours,
        snapshot_path = %config.snapshot_path.display(),
        "config loaded"
    );

    // Load the vibe taxonomy once; every index rebuild reuses the same
    // reference so curator edits require a deploy, not a runtime reload.
    let candidates = dictionary::load_candidates();
    let categories = Arc::new(Categories::load(&candidates));
    drop(candidates);

    // Try to load an existing snapshot so we can serve immediately on boot.
    // A missing snapshot is fine — scheduler will run the first batch.
    let (initial_index, initial_mtime) = match snapshot::load(&config.snapshot_path) {
        Ok(snap) => {
            let start = Instant::now();
            let entries = snap.entries.len();
            let tlds = snap.all_tlds.len();
            let idx = DomainIndex::from_snapshot(&snap, &categories);
            drop(snap);
            let mtime = std::fs::metadata(&config.snapshot_path)
                .and_then(|m| m.modified())
                .ok()
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as i64);
            info!(
                entries,
                tlds,
                elapsed_ms = start.elapsed().as_millis(),
                "loaded existing snapshot"
            );
            (Some(Arc::new(idx)), mtime)
        }
        Err(e) => {
            warn!(error = %e, "no snapshot on disk; server will serve 503 until first batch completes");
            (None, None)
        }
    };

    let state = Arc::new(AppState::new(config, initial_index, categories));
    if let Some(ts) = initial_mtime {
        state.update_batch(|s| {
            s.snapshot_updated_at_ms = Some(ts);
            // Treat an existing on-disk snapshot as a prior success so the
            // scheduler waits for the nightly window instead of re-running now.
            s.last_success_at_ms = Some(ts.min(now_ms()));
        });
    }

    // CORS
    let cors_origin = std::env::var("CORS_ORIGIN").unwrap_or_else(|_| "*".to_string());
    let cors = if cors_origin == "*" {
        info!("CORS: allowing all origins (development mode)");
        CorsLayer::permissive()
    } else {
        info!(origin = %cors_origin, "CORS: restricting to origin");
        CorsLayer::new()
            .allow_origin(
                cors_origin
                    .parse::<axum::http::HeaderValue>()
                    .expect("invalid CORS_ORIGIN"),
            )
            .allow_methods([axum::http::Method::GET])
            .allow_headers([axum::http::header::CONTENT_TYPE, axum::http::header::ACCEPT])
    };

    let app = Router::new()
        .route("/health", get(handlers::health_handler))
        .route("/ready", get(handlers::ready_handler))
        .route("/search", get(handlers::search_handler))
        .route("/stream", get(handlers::stream_handler))
        .route("/tlds", get(handlers::tlds_handler))
        .route("/tlds-for", get(handlers::tlds_for_handler))
        .route("/categories", get(handlers::categories_handler))
        .route("/stats", get(handlers::stats_handler))
        .layer(cors)
        .with_state(state.clone());

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind port");
    info!(%addr, "server started");

    // Scheduler runs in background. It will kick off the first batch
    // immediately if no snapshot was loaded.
    let scheduler_state = state.clone();
    tokio::spawn(async move {
        scheduler::run(scheduler_state).await;
    });

    axum::serve(listener, app).await.unwrap();
}
