use rustc_hash::FxHashMap;
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

/// Embedded at compile time so the binary carries its own curated taxonomy.
const WORDLIST_JSON: &str = include_str!("../data/wordlist.json");

/// Metadata for one shelf category, served to the frontend.
#[derive(Debug, Clone, Serialize)]
pub struct CategoryInfo {
    pub id: String,
    pub title: String,
    pub description: String,
    pub word_count: usize,
}

/// Raw form parsed from `wordlist.json` before dictionary validation.
#[derive(Debug, Deserialize)]
struct CategoryDefRaw {
    title: String,
    description: String,
    words: Vec<String>,
}

pub struct Categories {
    /// Category IDs in the order they appear in the JSON. Frontend renders
    /// in this order so the file is the single source of truth.
    order: Vec<String>,
    /// id → metadata + validated word list.
    defs: FxHashMap<String, CategoryDef>,
    /// word → list of category IDs the word belongs to.
    /// Every lookup during index build hits this; keeping it flat is cheap.
    word_to_cats: FxHashMap<String, Vec<String>>,
}

#[derive(Debug)]
struct CategoryDef {
    title: String,
    description: String,
    words: Vec<String>,
}

impl Categories {
    /// Parse the embedded wordlist and drop any word not present in the
    /// candidate dictionary (so stale entries don't silently shadow reality).
    pub fn load() -> Self {
        // `preserve_order` feature keeps JSON object ordering so curator
        // intent survives. Keys prefixed with `_` are treated as comments.
        let parsed: serde_json::Map<String, serde_json::Value> =
            serde_json::from_str(WORDLIST_JSON).expect("wordlist.json: invalid JSON");

        let mut order: Vec<String> = Vec::new();
        let mut defs: FxHashMap<String, CategoryDef> = FxHashMap::default();
        let mut word_to_cats: FxHashMap<String, Vec<String>> = FxHashMap::default();

        for (key, value) in parsed {
            if key.starts_with('_') {
                continue; // comment / metadata key
            }
            let def: CategoryDefRaw = match serde_json::from_value(value) {
                Ok(d) => d,
                Err(e) => {
                    warn!(category = %key, error = %e, "wordlist.json: skipping malformed category");
                    continue;
                }
            };

            // wordlist.json is now the single source of truth for candidates,
            // so every word here is guaranteed to be in the candidate set.
            let mut kept: Vec<String> = Vec::with_capacity(def.words.len());
            for word in def.words {
                word_to_cats
                    .entry(word.clone())
                    .or_default()
                    .push(key.clone());
                kept.push(word);
            }

            info!(
                category = %key,
                count = kept.len(),
                "wordlist.json: category loaded"
            );

            order.push(key.clone());
            defs.insert(
                key,
                CategoryDef {
                    title: def.title,
                    description: def.description,
                    words: kept,
                },
            );
        }

        // Deterministic per-word category order for reproducible search output.
        for cats in word_to_cats.values_mut() {
            cats.sort();
            cats.dedup();
        }

        Self {
            order,
            defs,
            word_to_cats,
        }
    }

    /// Empty taxonomy  used when the server boots before the dictionary is
    /// available (e.g. in tests). Search degrades to "no category matches".
    pub fn empty() -> Self {
        Self {
            order: Vec::new(),
            defs: FxHashMap::default(),
            word_to_cats: FxHashMap::default(),
        }
    }

    /// Categories a word belongs to, empty slice if none.
    pub fn categories_for(&self, word: &str) -> &[String] {
        self.word_to_cats
            .get(word)
            .map(Vec::as_slice)
            .unwrap_or(&[])
    }

    /// All category IDs that exist (for validating query params).
    pub fn has(&self, id: &str) -> bool {
        self.defs.contains_key(id)
    }

    /// Public metadata list in curated order.
    pub fn list(&self) -> Vec<CategoryInfo> {
        self.order
            .iter()
            .filter_map(|id| {
                self.defs.get(id).map(|d| CategoryInfo {
                    id: id.clone(),
                    title: d.title.clone(),
                    description: d.description.clone(),
                    word_count: d.words.len(),
                })
            })
            .collect()
    }
}
