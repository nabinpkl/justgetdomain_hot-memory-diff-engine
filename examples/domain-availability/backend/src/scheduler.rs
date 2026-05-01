use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, TimeZone, Timelike, Utc};
use chrono_tz::Tz;
use tracing::{debug, info, warn};

use crate::batch_runner;
use crate::config::BatchConfig;
use crate::state::{AppState, BatchStatus};

#[derive(Debug)]
enum Decision {
    RunNow(Reason),
    SleepUntil(DateTime<Utc>),
}

#[derive(Debug, Clone, Copy)]
enum Reason {
    FirstBoot,
    Stale,
    ScheduledWindow,
}

/// Max we'll sleep in one tick; re-evaluates state after this even if nothing
/// else fires. Keeps the scheduler responsive to clock jumps / manual actions.
const MAX_SLEEP: Duration = Duration::from_secs(3600);

pub async fn run(state: Arc<AppState>) {
    info!(
        schedule_hour = state.config.start_hour,
        window_hours = state.config.window_hours,
        timezone = %state.config.timezone,
        stale_after_hours = state.config.stale_after_hours,
        "scheduler started"
    );

    loop {
        let now = Utc::now();
        let decision = decide_next(&state, now);

        // Publish next-scheduled-run so /stats can show it.
        if let Decision::SleepUntil(t) = decision {
            let ms = t.timestamp_millis();
            state.update_batch(|s| s.next_scheduled_run_ms = Some(ms));
        }

        match decision {
            Decision::RunNow(reason) => {
                info!(?reason, "triggering batch");
                state.update_batch(|s| s.next_scheduled_run_ms = None);
                if let Err(e) = batch_runner::run_batch(&state).await {
                    warn!(error = %e, "batch errored; scheduler will back off");
                }
            }
            Decision::SleepUntil(until) => {
                let dur = (until - Utc::now())
                    .to_std()
                    .unwrap_or(Duration::from_secs(60))
                    .min(MAX_SLEEP);
                debug!(?dur, until = %until, "scheduler sleeping");
                tokio::time::sleep(dur).await;
            }
        }
    }
}

fn decide_next(state: &AppState, now: DateTime<Utc>) -> Decision {
    let status = state.batch.load_full();
    let cfg = &state.config;
    let has_index = state.index.load().is_some();

    // Backoff check runs FIRST. If the last attempt failed, honor the
    // cooldown regardless of why we'd otherwise want to run. Putting
    // FirstBoot ahead of this would hot-spin: after a first-boot failure,
    // `!has_index && last_success.is_none()` stays true forever, so
    // FirstBoot would fire on every tick with no throttle.
    if status.last_error.is_some() {
        if let Some(last_attempt) = status.last_attempt_at_ms {
            let backoff_ms = backoff(&status).as_millis() as i64;
            let unlock_at = last_attempt + backoff_ms;
            if now.timestamp_millis() < unlock_at {
                let t = DateTime::<Utc>::from_timestamp_millis(unlock_at)
                    .unwrap_or(now + chrono::Duration::seconds(60));
                return Decision::SleepUntil(t);
            }
        }
    }

    // First run ever: nothing to serve and nothing to wait for.
    if !has_index && status.last_success_at_ms.is_none() {
        return Decision::RunNow(Reason::FirstBoot);
    }

    // Stale snapshot: catch up immediately (handles "server was down").
    if let Some(last_ok) = status.last_success_at_ms {
        let age_hours = (now.timestamp_millis() - last_ok).max(0) as u64 / 3_600_000;
        if age_hours >= cfg.stale_after_hours {
            return Decision::RunNow(Reason::Stale);
        }
    }

    // In the nightly window AND we haven't already succeeded during it today.
    let now_tz = now.with_timezone(&cfg.timezone);
    if in_window(&now_tz, cfg) {
        let already_ran_today = match status.last_success_at_ms {
            Some(ms) => DateTime::<Utc>::from_timestamp_millis(ms)
                .map(|t| t.with_timezone(&cfg.timezone).date_naive() == now_tz.date_naive())
                .unwrap_or(false),
            None => false,
        };
        if !already_ran_today {
            return Decision::RunNow(Reason::ScheduledWindow);
        }
    }

    Decision::SleepUntil(next_window_start(&now_tz, cfg))
}

/// Exponential backoff: 15m → 1h → 4h → 12h (capped).
fn backoff(status: &BatchStatus) -> Duration {
    match status.consecutive_failures {
        0 | 1 => Duration::from_secs(15 * 60),
        2 => Duration::from_secs(60 * 60),
        3 => Duration::from_secs(4 * 60 * 60),
        _ => Duration::from_secs(12 * 60 * 60),
    }
}

fn in_window(now_tz: &DateTime<Tz>, cfg: &BatchConfig) -> bool {
    let h = now_tz.hour();
    let start = cfg.start_hour;
    let end = start + cfg.window_hours;
    if end <= 24 {
        h >= start && h < end
    } else {
        // wraparound (e.g. 23:00 + 3h spans 23,0,1)
        h >= start || h < (end - 24)
    }
}

fn next_window_start(now_tz: &DateTime<Tz>, cfg: &BatchConfig) -> DateTime<Utc> {
    // Compute today's window-start in cfg timezone, advance by a day if it has passed.
    let today_start_naive = now_tz
        .date_naive()
        .and_hms_opt(cfg.start_hour, 0, 0)
        .expect("valid hour validated in config");

    let candidate = cfg
        .timezone
        .from_local_datetime(&today_start_naive)
        .earliest()
        .unwrap_or_else(|| now_tz.clone());

    let target = if candidate <= *now_tz {
        candidate + chrono::Duration::days(1)
    } else {
        candidate
    };
    target.with_timezone(&Utc)
}
