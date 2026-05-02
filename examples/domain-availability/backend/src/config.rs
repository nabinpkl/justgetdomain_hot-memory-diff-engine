use std::path::PathBuf;
use std::time::Duration;

use anyhow::{Context, Result, anyhow, bail};
use chrono_tz::Tz;

use crate::scanner::ScannerKind;

/// Runtime configuration for the batch pipeline and scheduler.
/// All fields come from env. Loaded once at boot  treat as immutable.
#[derive(Debug, Clone)]
pub struct BatchConfig {
    /// When false, the scheduler is never started and no nightly download
    /// runs. The server boots from the on-disk snapshot and serves it as-is.
    /// Re-enable by setting `DOWNLOAD_DOMAINS=true`.
    pub downloads_enabled: bool,
    /// Provider URL for the nightly zip. Required only when
    /// `downloads_enabled` is true; ignored otherwise.
    pub download_url: Option<String>,
    pub data_dir: PathBuf,
    pub snapshot_path: PathBuf,
    pub domains_txt_path: PathBuf,
    pub domains_zip_path: PathBuf,
    pub start_hour: u32,
    pub window_hours: u32,
    pub timezone: Tz,
    pub stale_after_hours: u64,
    pub download_timeout: Duration,
    pub min_download_bytes: u64,
    /// Which scan algorithm the batch pipeline runs. Set with `SCANNER` env.
    /// Exists purely so we can flip it at boot and re-run the batch to
    /// capture side-by-side timings for the portfolio write-up.
    pub scanner_kind: ScannerKind,
}

impl BatchConfig {
    pub fn from_env() -> Result<Self> {
        let downloads_enabled = parse_bool_env("DOWNLOAD_DOMAINS", false);

        let download_url = if downloads_enabled {
            let url = std::env::var("DOMAINS_DOWNLOAD_URL").context(
                "DOMAINS_DOWNLOAD_URL is required when DOWNLOAD_DOMAINS=true",
            )?;
            if url.trim().is_empty() {
                bail!("DOMAINS_DOWNLOAD_URL is empty (DOWNLOAD_DOMAINS=true)");
            }
            Some(url)
        } else {
            None
        };

        let data_dir = std::env::var("DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("data"));

        let snapshot_path = std::env::var("SNAPSHOT_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| data_dir.join("snapshot.bin"));

        let domains_txt_path = std::env::var("DOMAINS_TXT_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| data_dir.join("domains.txt"));

        let domains_zip_path = std::env::var("DOMAINS_ZIP_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| data_dir.join("domains.zip"));

        let start_hour: u32 = parse_env("BATCH_START_HOUR_CET", 0)?;
        if start_hour > 23 {
            bail!("BATCH_START_HOUR_CET must be 0–23, got {start_hour}");
        }

        let window_hours: u32 = parse_env("BATCH_WINDOW_HOURS", 1)?;
        if window_hours == 0 || window_hours > 24 {
            bail!("BATCH_WINDOW_HOURS must be 1–24, got {window_hours}");
        }

        let tz_name =
            std::env::var("BATCH_TIMEZONE").unwrap_or_else(|_| "Europe/Berlin".to_string());
        let timezone: Tz = tz_name
            .parse()
            .map_err(|e| anyhow!("invalid BATCH_TIMEZONE '{tz_name}': {e}"))?;

        let stale_after_hours: u64 = parse_env("STALE_AFTER_HOURS", 25)?;
        if stale_after_hours == 0 {
            bail!("STALE_AFTER_HOURS must be > 0");
        }

        let timeout_secs: u64 = parse_env("DOWNLOAD_TIMEOUT_SECS", 1800)?;
        let min_download_bytes: u64 = parse_env("MIN_DOWNLOAD_BYTES", 100_000_000)?;

        let scanner_kind: ScannerKind = match std::env::var("SCANNER") {
            Ok(v) => v
                .parse::<ScannerKind>()
                .map_err(|e| anyhow!("SCANNER invalid: {e}"))?,
            Err(_) => ScannerKind::Binary,
        };

        Ok(Self {
            downloads_enabled,
            download_url,
            data_dir,
            snapshot_path,
            domains_txt_path,
            domains_zip_path,
            start_hour,
            window_hours,
            timezone,
            stale_after_hours,
            download_timeout: Duration::from_secs(timeout_secs),
            min_download_bytes,
            scanner_kind,
        })
    }

    /// URL with path masked  safe to log. Keeps scheme + host only.
    /// Returns "<disabled>" when downloads are off, and "<invalid-url>" if
    /// configured but unparseable.
    pub fn redacted_url(&self) -> String {
        let Some(url) = self.download_url.as_deref() else {
            return "<disabled>".to_string();
        };
        if let Some(scheme_end) = url.find("://") {
            let rest = &url[scheme_end + 3..];
            let host = rest.split('/').next().unwrap_or("");
            return format!("{}://{host}/<redacted>", &url[..scheme_end]);
        }
        "<invalid-url>".to_string()
    }
}

/// Parse a boolean env var with truthy values: true / 1 / yes / on (case-insensitive).
/// Anything else (including unset) returns the default.
fn parse_bool_env(key: &str, default: bool) -> bool {
    match std::env::var(key) {
        Ok(v) => matches!(
            v.trim().to_ascii_lowercase().as_str(),
            "true" | "1" | "yes" | "on"
        ),
        Err(_) => default,
    }
}

fn parse_env<T: std::str::FromStr>(key: &str, default: T) -> Result<T>
where
    <T as std::str::FromStr>::Err: std::fmt::Display,
{
    match std::env::var(key) {
        Ok(v) => v
            .parse::<T>()
            .map_err(|e| anyhow!("{key} invalid: {e}")),
        Err(_) => Ok(default),
    }
}
