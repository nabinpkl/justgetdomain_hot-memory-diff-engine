use std::sync::{Arc, Mutex as StdMutex};

use arc_swap::ArcSwap;
use chrono::Utc;
use hdrhistogram::Histogram;
use hot_index::HotSwap;
use serde::Serialize;
use tokio::sync::Mutex;

use crate::categories::Categories;
use crate::config::BatchConfig;
use crate::index::DomainIndex;
use crate::scanner::ScannerKind;

/// Shared application state. Handlers read from it lock-free; the scheduler
/// swaps a new index into place atomically when a batch succeeds.
///
/// `index` uses [`HotSwap<Option<DomainIndex>>`] from the `hot-index`
/// crate — `Option` because the first-boot path serves before the first
/// batch completes. `batch` stays on raw [`ArcSwap`] because its update
/// pattern is per-field mutation via a closure, not full-value swap; it
/// doesn't fit `HotSwap`'s build-once-publish-once model.
pub struct AppState {
    pub index: HotSwap<Option<DomainIndex>>,
    pub batch: ArcSwap<BatchStatus>,
    pub batch_lock: Mutex<()>,
    pub config: BatchConfig,
    /// Loaded once at startup. Shared by the boot-time index build and every
    /// subsequent batch rebuild so curator intent stays consistent without a
    /// process restart.
    pub categories: Arc<Categories>,
    /// Per-request elapsed-time histogram in microseconds. Lifetime
    /// (process-start) accumulator — homepage shows p50/p99 since boot.
    /// `StdMutex` (not tokio's) because access is short and synchronous;
    /// blocking briefly in an async context is fine for microsecond-held
    /// locks under modest load.
    pub request_latency_us: StdMutex<Histogram<u64>>,
}

impl AppState {
    pub fn new(
        config: BatchConfig,
        initial_index: Option<DomainIndex>,
        categories: Arc<Categories>,
    ) -> Self {
        // 1 µs minimum, 60 s maximum, 3 significant figures.
        let hist = Histogram::<u64>::new_with_bounds(1, 60_000_000, 3)
            .expect("valid histogram bounds");
        Self {
            index: HotSwap::new(initial_index),
            batch: ArcSwap::from_pointee(BatchStatus::default()),
            batch_lock: Mutex::new(()),
            config,
            categories,
            request_latency_us: StdMutex::new(hist),
        }
    }

    /// Record one elapsed measurement in µs. Errors (lock poisoning,
    /// out-of-range value) are silently dropped — this is observability,
    /// not correctness.
    pub fn record_request_latency(&self, micros: u64) {
        if let Ok(mut h) = self.request_latency_us.lock() {
            let _ = h.record(micros.max(1).min(60_000_000));
        }
    }

    /// Atomically update BatchStatus via a closure.
    pub fn update_batch<F>(&self, f: F)
    where
        F: FnOnce(&mut BatchStatus),
    {
        let cur = self.batch.load();
        let mut next = (**cur).clone();
        f(&mut next);
        self.batch.store(Arc::new(next));
    }
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    #[default]
    Idle,
    Downloading,
    Extracting,
    Scanning,
    Swapping,
    Failed,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct BatchStatus {
    pub phase: Phase,
    pub last_success_at_ms: Option<i64>,
    pub last_attempt_at_ms: Option<i64>,
    pub last_error: Option<String>,
    pub snapshot_updated_at_ms: Option<i64>,
    pub consecutive_failures: u32,
    pub next_scheduled_run_ms: Option<i64>,
    /// Which scanner ran in the last batch. Surfaced on /stats so screenshots
    /// can label the run without needing to correlate against logs.
    pub last_scan_kind: Option<ScannerKind>,
    /// Wall-clock time of just the scan step (not the full batch). This is
    /// the headline number for the binary-vs-linear comparison.
    pub last_scan_elapsed_ms: Option<u64>,
}

pub fn now_ms() -> i64 {
    Utc::now().timestamp_millis()
}
