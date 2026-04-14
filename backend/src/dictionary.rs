use rustc_hash::FxHashSet;

const WORDS_SELECTIVE: &str = include_str!("../data/words_selective.txt");
const WORDS_FULL: &str = include_str!("../data/words_full.txt");

/// Pluggable wordlist. Production ships `selective` (curated, brand- and
/// scam-bait-filtered). Set `JGD_WORDLIST=full` to opt into the unfiltered
/// dictionary for development. Unknown values fall back to selective.
fn pick_wordlist() -> (&'static str, &'static str) {
    match std::env::var("JGD_WORDLIST").as_deref() {
        Ok("full") => ("full", WORDS_FULL),
        Ok("selective") | Err(_) => ("selective", WORDS_SELECTIVE),
        Ok(other) => {
            tracing::warn!(
                value = other,
                "unknown JGD_WORDLIST value, defaulting to selective"
            );
            ("selective", WORDS_SELECTIVE)
        }
    }
}

/// Load the embedded word list into an FxHashSet.
/// Filters to lowercase alpha-only words, 3-6 characters.
/// Lines starting with `#` are treated as comments and skipped.
pub fn load_candidates() -> FxHashSet<String> {
    let (name, raw) = pick_wordlist();
    let mut set = FxHashSet::default();
    for line in raw.lines() {
        let word = line.trim();
        if word.is_empty() || word.starts_with('#') {
            continue;
        }
        if word.len() >= 3
            && word.len() <= 6
            && word.bytes().all(|b| b.is_ascii_lowercase())
        {
            set.insert(word.to_string());
        }
    }
    tracing::info!(wordlist = name, count = set.len(), "loaded candidate wordlist");
    set
}
