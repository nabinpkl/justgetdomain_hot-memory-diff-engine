use rustc_hash::FxHashSet;

const WORDLIST_JSON: &str = include_str!("../data/wordlist.json");

/// Load all words from the embedded wordlist.json into an FxHashSet.
/// Every word in the JSON (across all categories) becomes a candidate domain name.
pub fn load_candidates() -> FxHashSet<String> {
    let parsed: serde_json::Map<String, serde_json::Value> =
        serde_json::from_str(WORDLIST_JSON).expect("wordlist.json: invalid JSON");

    let mut set = FxHashSet::default();
    for (key, value) in &parsed {
        if key.starts_with('_') {
            continue; // metadata / comment key
        }
        if let Some(words) = value.get("words").and_then(|w| w.as_array()) {
            for w in words {
                if let Some(s) = w.as_str() {
                    set.insert(s.to_string());
                }
            }
        }
    }

    tracing::info!(count = set.len(), "loaded candidate wordlist from wordlist.json");
    set
}
