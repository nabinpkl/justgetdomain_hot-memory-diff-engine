use std::io;
use std::path::Path;
use std::sync::Arc;
use std::time::Instant;

use anyhow::{Context, Result, anyhow, bail};
use futures_util::StreamExt;
use tokio::io::AsyncWriteExt;
use tracing::{error, info, warn};

use crate::dictionary;
use crate::index::DomainIndex;
use crate::scanner;
use crate::snapshot::{self, Snapshot, SnapshotEntry};
use crate::state::{AppState, Phase, now_ms};

/// Orchestrates one end-to-end batch:
/// download → extract → scan → persist → atomic in-memory swap.
///
/// On any failure, the in-memory index and on-disk snapshot are left
/// untouched. Old data continues to serve. Status reflects the failure.
pub async fn run_batch(state: &Arc<AppState>) -> Result<()> {
    let _guard = state
        .batch_lock
        .try_lock()
        .map_err(|_| anyhow!("batch already running"))?;

    state.update_batch(|s| {
        s.last_attempt_at_ms = Some(now_ms());
        s.last_error = None;
        s.phase = Phase::Downloading;
    });

    let result = do_run_batch(state).await;

    match &result {
        Ok(()) => {
            state.update_batch(|s| {
                s.phase = Phase::Idle;
                s.last_error = None;
                s.last_success_at_ms = Some(now_ms());
                s.consecutive_failures = 0;
            });
            info!("batch completed successfully");
        }
        Err(e) => {
            let msg = format!("{e:#}");
            error!(error = %msg, "batch failed");
            state.update_batch(|s| {
                s.phase = Phase::Failed;
                s.last_error = Some(msg);
                s.consecutive_failures = s.consecutive_failures.saturating_add(1);
            });
        }
    }

    result
}

async fn do_run_batch(state: &Arc<AppState>) -> Result<()> {
    let cfg = &state.config;

    tokio::fs::create_dir_all(&cfg.data_dir)
        .await
        .with_context(|| format!("create data dir {}", cfg.data_dir.display()))?;

    // 1. Download ZIP → atomic rename
    info!(url = %cfg.redacted_url(), "downloading domain list");
    let dl_start = Instant::now();
    let bytes = download_to_file(
        &cfg.download_url,
        &cfg.domains_zip_path,
        cfg.download_timeout,
        cfg.min_download_bytes,
    )
    .await
    .context("download failed")?;
    info!(
        bytes,
        elapsed_ms = dl_start.elapsed().as_millis(),
        path = %cfg.domains_zip_path.display(),
        "download finished"
    );

    // 2. Extract ZIP → atomic rename
    state.update_batch(|s| s.phase = Phase::Extracting);
    info!("extracting zip");
    let ex_start = Instant::now();
    let zip_path = cfg.domains_zip_path.clone();
    let txt_path = cfg.domains_txt_path.clone();
    let extracted_bytes = tokio::task::spawn_blocking(move || extract_zip(&zip_path, &txt_path))
        .await
        .map_err(|e| anyhow!("extract task join error: {e}"))?
        .context("extract failed")?;
    info!(
        bytes = extracted_bytes,
        elapsed_ms = ex_start.elapsed().as_millis(),
        path = %cfg.domains_txt_path.display(),
        "extraction finished"
    );

    // 3. Scan (CPU-bound → spawn_blocking)
    state.update_batch(|s| s.phase = Phase::Scanning);
    info!("scanning domains file");
    let sc_start = Instant::now();
    let data_path = cfg.domains_txt_path.clone();
    let snapshot = tokio::task::spawn_blocking(move || build_snapshot(&data_path))
        .await
        .map_err(|e| anyhow!("scan task join error: {e}"))?
        .context("scan failed")?;
    info!(
        entries = snapshot.entries.len(),
        tlds = snapshot.all_tlds.len(),
        elapsed_ms = sc_start.elapsed().as_millis(),
        "scan finished"
    );

    // 4. Persist snapshot (atomic tmp+rename inside snapshot::save)
    let snapshot_path = cfg.snapshot_path.clone();
    let snapshot_for_save = Arc::new(snapshot);
    let snapshot_for_save_clone = Arc::clone(&snapshot_for_save);
    let saved_path = snapshot_path.clone();
    tokio::task::spawn_blocking(move || snapshot::save(&saved_path, &snapshot_for_save_clone))
        .await
        .map_err(|e| anyhow!("snapshot save task join error: {e}"))?
        .context("snapshot save failed")?;

    let snapshot_mtime_ms = read_mtime_ms(&snapshot_path);

    // 5. Build index + atomic swap (wait-free for readers)
    state.update_batch(|s| s.phase = Phase::Swapping);
    let idx_start = Instant::now();
    let snapshot_for_index = Arc::clone(&snapshot_for_save);
    let categories_for_index = Arc::clone(&state.categories);
    let index = tokio::task::spawn_blocking(move || {
        DomainIndex::from_snapshot(&snapshot_for_index, &categories_for_index)
    })
    .await
    .map_err(|e| anyhow!("index build join error: {e}"))?;
    state.index.store(Some(Arc::new(index)));
    info!(
        elapsed_ms = idx_start.elapsed().as_millis(),
        "index swapped"
    );

    state.update_batch(|s| {
        s.snapshot_updated_at_ms = snapshot_mtime_ms;
    });

    // Best-effort cleanup of the zip (keep txt around for debugging).
    if let Err(e) = tokio::fs::remove_file(&cfg.domains_zip_path).await {
        warn!(error = %e, "failed to remove zip after extract (non-fatal)");
    }

    Ok(())
}

async fn download_to_file(
    url: &str,
    final_path: &Path,
    timeout: std::time::Duration,
    min_bytes: u64,
) -> Result<u64> {
    let client = reqwest::Client::builder()
        .timeout(timeout)
        .build()
        .context("build http client")?;

    let response = client.get(url).send().await.context("send request")?;
    let status = response.status();
    if !status.is_success() {
        bail!("unexpected HTTP status {status}");
    }

    let tmp_path = final_path.with_extension("downloading");
    if let Some(parent) = tmp_path.parent() {
        tokio::fs::create_dir_all(parent).await.ok();
    }
    let mut file = tokio::fs::File::create(&tmp_path)
        .await
        .with_context(|| format!("create {}", tmp_path.display()))?;

    let mut stream = response.bytes_stream();
    let mut written: u64 = 0;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.context("read chunk")?;
        file.write_all(&chunk).await.context("write chunk")?;
        written += chunk.len() as u64;
    }
    file.sync_all().await.context("fsync")?;
    drop(file);

    if written < min_bytes {
        let _ = tokio::fs::remove_file(&tmp_path).await;
        bail!(
            "download too small: {written} bytes (min {min_bytes}); provider likely returned an error page"
        );
    }

    tokio::fs::rename(&tmp_path, final_path)
        .await
        .with_context(|| {
            format!(
                "rename {} -> {}",
                tmp_path.display(),
                final_path.display()
            )
        })?;

    Ok(written)
}

/// Extract the largest `.txt` entry from the zip into `output_path` (atomic).
/// Returns the number of bytes written.
fn extract_zip(zip_path: &Path, output_path: &Path) -> Result<u64> {
    let file = std::fs::File::open(zip_path)
        .with_context(|| format!("open {}", zip_path.display()))?;
    let mut archive =
        zip::ZipArchive::new(file).context("read zip central directory")?;

    if archive.is_empty() {
        bail!("zip archive is empty");
    }

    // Choose the largest .txt entry (the domain dump). Fall back to largest entry.
    let mut target_idx: Option<usize> = None;
    let mut target_size: u64 = 0;
    for i in 0..archive.len() {
        let entry = archive.by_index(i).context("read zip entry")?;
        if entry.is_dir() {
            continue;
        }
        let name = entry.name();
        let size = entry.size();
        if name.ends_with(".txt") && size > target_size {
            target_idx = Some(i);
            target_size = size;
        }
    }
    if target_idx.is_none() {
        // fallback: largest any-extension file
        for i in 0..archive.len() {
            let entry = archive.by_index(i).context("read zip entry")?;
            if entry.is_dir() {
                continue;
            }
            if entry.size() > target_size {
                target_idx = Some(i);
                target_size = entry.size();
            }
        }
    }
    let idx = target_idx.ok_or_else(|| anyhow!("no usable entry in zip"))?;
    let mut entry = archive.by_index(idx).context("open selected entry")?;
    info!(name = entry.name(), size = entry.size(), "extracting zip entry");

    let tmp_path = output_path.with_extension("extracting");
    let mut out = std::fs::File::create(&tmp_path)
        .with_context(|| format!("create {}", tmp_path.display()))?;
    let written = io::copy(&mut entry, &mut out).context("copy zip entry")?;
    out.sync_all().context("fsync extracted file")?;
    drop(out);

    std::fs::rename(&tmp_path, output_path).with_context(|| {
        format!(
            "rename {} -> {}",
            tmp_path.display(),
            output_path.display()
        )
    })?;

    Ok(written)
}

/// Scan domains.txt against the candidate dictionary and assemble a Snapshot.
/// Shared code path with the legacy `bin/batch` CLI.
pub fn build_snapshot(data_path: &Path) -> Result<Snapshot> {
    let candidates = dictionary::load_candidates();
    let scan_output = scanner::scan_domains(data_path, &candidates)
        .with_context(|| format!("scan {}", data_path.display()))?;

    let mut results = scan_output.results;
    results.sort_by_key(|r| r.registered_tlds.len());

    let matched: rustc_hash::FxHashSet<String> =
        results.iter().map(|r| r.word.clone()).collect();

    let mut entries: Vec<SnapshotEntry> = results
        .into_iter()
        .map(|r| SnapshotEntry {
            word: r.word,
            registered_tlds: r.registered_tlds,
        })
        .collect();

    for candidate in &candidates {
        if !matched.contains(candidate) {
            entries.push(SnapshotEntry {
                word: candidate.clone(),
                registered_tlds: Vec::new(),
            });
        }
    }
    entries.sort_by(|a, b| a.word.cmp(&b.word));

    Ok(Snapshot {
        all_tlds: scan_output.all_tlds,
        entries,
    })
}

fn read_mtime_ms(path: &Path) -> Option<i64> {
    let modified = std::fs::metadata(path).ok()?.modified().ok()?;
    let d = modified.duration_since(std::time::UNIX_EPOCH).ok()?;
    Some(d.as_millis() as i64)
}
