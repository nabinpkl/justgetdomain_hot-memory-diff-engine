
Runtime + HTTP + SSE:

tokio — async runtime, everything runs on this
axum — HTTP server, has axum::response::sse built in
tower / tower-http — middleware layer for your connection hygiene (per-IP limits, timeouts, CORS)

Batch pipeline (streaming the 5.6GB file):

tokio::io::BufReader + tokio::io::AsyncBufReadExt — stream line-by-line, never load full file
std::collections::HashSet — your candidate set (dictionary words). It's stdlib, no crate needed
rustc-hash (FxHashSet) — drop-in faster HashSet if you want ~2x lookup speed, same API

Snapshot persistence:

bincode + serde — serialize/deserialize the available set to disk. Binary, fast, compact. This is your crash-recovery snapshot
serde + serde_json — for the HTTP response serialization (SSE JSON payloads)

Connection hygiene middleware:

tower::limit::ConcurrencyLimitLayer — max concurrent connections
tower_http::timeout::TimeoutLayer — request/connection timeouts
Custom extractor or middleware for per-IP tracking (Axum makes this straightforward with ConnectInfo<SocketAddr>)

Observability (lightweight):

tracing + tracing-subscriber — structured logging, the Tokio ecosystem standard

