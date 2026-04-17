use std::sync::Arc;

use arc_swap::{ArcSwap, ArcSwapOption};
use chrono::Utc;
use serde::Serialize;
use tokio::sync::Mutex;

use crate::categories::Categories;
use crate::config::BatchConfig;
use crate::index::DomainIndex;
use crate::scanner::ScannerKind;

/// Shared application state. Handlers read from it lock-free; the scheduler
/// swaps a new index into place atomically when a batch succeeds.
pub struct AppState {
    pub index: ArcSwapOption<DomainIndex>,
    pub batch: ArcSwap<BatchStatus>,
    pub batch_lock: Mutex<()>,
    pub config: BatchConfig,
    /// Loaded once at startup. Shared by the boot-time index build and every
    /// subsequent batch rebuild so curator intent stays consistent without a
    /// process restart.
    pub categories: Arc<Categories>,
}

impl AppState {
    pub fn new(
        config: BatchConfig,
        initial_index: Option<Arc<DomainIndex>>,
        categories: Arc<Categories>,
    ) -> Self {
        Self {
            index: ArcSwapOption::from(initial_index),
            batch: ArcSwap::from_pointee(BatchStatus::default()),
            batch_lock: Mutex::new(()),
            config,
            categories,
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
