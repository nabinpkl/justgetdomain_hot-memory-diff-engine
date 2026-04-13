use rustc_hash::FxHashSet;

const WORDS_RAW: &str = include_str!("../data/words.txt");

/// Load the embedded word list into an FxHashSet.
/// Filters to lowercase alpha-only words, 3-6 characters.
pub fn load_candidates() -> FxHashSet<String> {
    let mut set = FxHashSet::default();
    for line in WORDS_RAW.lines() {
        let word = line.trim();
        if word.len() >= 3
            && word.len() <= 6
            && word.bytes().all(|b| b.is_ascii_lowercase())
        {
            set.insert(word.to_string());
        }
    }
    set
}
