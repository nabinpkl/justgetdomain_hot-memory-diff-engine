use rustc_hash::FxHashSet;
use std::time::Instant;
use tracing::info;

use crate::snapshot::Snapshot;

/// TLDs shown individually in the UI, in priority sort order.
/// Index position = sort rank. Everything else comes after, alphabetically.
pub const DISPLAY_TLDS: &[&str] = &[
    ".com", ".dev", ".io", ".ai", ".app", ".sh", ".xyz", ".net", ".org", ".tech", ".studio",
    ".space", ".academy", ".desgin", ".bio", ".work", ".to", ".tube", ".online", ".one", ".new",
    ".name", ".me", ".inc", ".host", ".fun", ".fm", ".food",
];

#[derive(Debug)]
struct IndexedEntry {
    word: String,
    length: usize,
    registered_tlds: FxHashSet<String>,
    available_count: usize,
}

pub struct DomainIndex {
    entries: Vec<IndexedEntry>,
    all_tlds: Vec<String>,
    by_alpha: Vec<usize>,
    by_tld_count: Vec<usize>,
    by_shortest: Vec<usize>,
}

#[derive(Debug)]
pub struct SearchParams {
    pub query: Option<String>,
    pub tlds: Option<Vec<String>>,
    pub tld_prefix: Option<String>,
    pub lengths: Option<Vec<usize>>,
    pub sort: SortMode,
}

#[derive(Debug, Default)]
pub enum SortMode {
    #[default]
    Alpha,
    Tlds,
    Shortest,
}

/// One row = one word+TLD pair.
#[derive(serde::Serialize)]
pub struct SearchResult {
    pub name: String,
    pub tld: String,
    pub length: usize,
}

impl DomainIndex {
    pub fn from_snapshot(snapshot: &Snapshot) -> Self {
        let start = Instant::now();

        // Build priority map: DISPLAY_TLDS get rank 0..N, everything else gets N+1
        let priority: rustc_hash::FxHashMap<&str, usize> = DISPLAY_TLDS
            .iter()
            .enumerate()
            .map(|(i, tld)| (*tld, i))
            .collect();
        let fallback_rank = DISPLAY_TLDS.len();

        let mut all_tlds: Vec<String> = snapshot.all_tlds.iter().map(|t| format!(".{t}")).collect();
        // Sort by priority rank first, then alphabetical within same rank
        all_tlds.sort_by(|a, b| {
            let ra = priority.get(a.as_str()).copied().unwrap_or(fallback_rank);
            let rb = priority.get(b.as_str()).copied().unwrap_or(fallback_rank);
            ra.cmp(&rb).then_with(|| a.cmp(b))
        });

        let all_tld_set: FxHashSet<&str> = all_tlds.iter().map(|s| s.as_str()).collect();
        let tld_count = all_tlds.len();

        let entries: Vec<IndexedEntry> = snapshot
            .entries
            .iter()
            .filter_map(|entry| {
                let registered: FxHashSet<String> = entry
                    .registered_tlds
                    .iter()
                    .map(|t| format!(".{t}"))
                    .collect();

                let available_count = tld_count - registered.len();
                if available_count == 0 {
                    return None;
                }

                debug_assert!(
                    registered.iter().all(|t| all_tld_set.contains(t.as_str())),
                    "word '{}' has registered TLD not in all_tlds set",
                    entry.word
                );

                Some(IndexedEntry {
                    length: entry.word.len(),
                    word: entry.word.clone(),
                    registered_tlds: registered,
                    available_count,
                })
            })
            .collect();

        let mut by_alpha: Vec<usize> = (0..entries.len()).collect();
        by_alpha.sort_by(|&a, &b| entries[a].word.cmp(&entries[b].word));

        let mut by_tld_count: Vec<usize> = (0..entries.len()).collect();
        by_tld_count.sort_by(|&a, &b| {
            entries[b]
                .available_count
                .cmp(&entries[a].available_count)
                .then_with(|| entries[a].word.cmp(&entries[b].word))
        });

        let mut by_shortest: Vec<usize> = (0..entries.len()).collect();
        by_shortest.sort_by(|&a, &b| {
            entries[a]
                .length
                .cmp(&entries[b].length)
                .then_with(|| entries[a].word.cmp(&entries[b].word))
        });

        let count = entries.len();
        let elapsed = start.elapsed();
        info!(count, tld_count, ?elapsed, "domain index built");

        Self {
            entries,
            all_tlds,
            by_alpha,
            by_tld_count,
            by_shortest,
        }
    }

    /// Return all TLDs in priority-ranked order.
    pub fn all_tlds(&self) -> &[String] {
        &self.all_tlds
    }

    fn sorted_indices(&self, sort: &SortMode) -> &[usize] {
        match sort {
            SortMode::Alpha => &self.by_alpha,
            SortMode::Tlds => &self.by_tld_count,
            SortMode::Shortest => &self.by_shortest,
        }
    }

    /// Get the list of TLDs to emit for an entry, respecting filters.
    fn matching_tlds(
        &self,
        entry: &IndexedEntry,
        tld_filter: &Option<FxHashSet<&str>>,
        tld_prefix: &Option<String>,
    ) -> Vec<&str> {
        let mut result = Vec::new();

        for tld in &self.all_tlds {
            if entry.registered_tlds.contains(tld) {
                continue;
            }

            // TLD prefix filter from dot-query (e.g. ".a" from "helmet.a")
            if let Some(prefix) = tld_prefix {
                if !tld.starts_with(prefix.as_str()) {
                    continue;
                }
            }

            if let Some(f) = &tld_filter {
                if !f.contains(tld.as_str()) {
                    continue;
                }
            }

            result.push(tld.as_str());
        }
        result
    }

    /// Paginated flat search. Each row = one word+TLD pair.
    pub fn search(
        &self,
        params: &SearchParams,
        offset: usize,
        limit: usize,
    ) -> (usize, Vec<SearchResult>) {
        let indices = self.sorted_indices(&params.sort);
        let query_lower = params.query.as_ref().map(|q| q.to_lowercase());
        let tld_filter: Option<FxHashSet<&str>> = params
            .tlds
            .as_ref()
            .map(|t| t.iter().map(|s| s.as_str()).collect());
        let length_filter: Option<FxHashSet<usize>> =
            params.lengths.as_ref().map(|l| l.iter().copied().collect());

        // Count total flat rows + collect windowed results in one pass
        let mut total = 0usize;
        let mut results = Vec::with_capacity(limit);
        let end = offset + limit;

        for &idx in indices {
            let entry = &self.entries[idx];

            if !Self::word_matches(entry, &query_lower, &length_filter) {
                continue;
            }

            let tlds = self.matching_tlds(entry, &tld_filter, &params.tld_prefix);
            if tlds.is_empty() {
                continue;
            }

            for tld in &tlds {
                if total >= offset && total < end {
                    results.push(SearchResult {
                        name: format!("{}{}", entry.word, tld),
                        tld: tld.to_string(),
                        length: entry.length,
                    });
                }
                total += 1;
            }
        }

        (total, results)
    }

    /// Streaming flat search.
    pub fn search_iter<'a>(
        &'a self,
        params: &'a SearchParams,
    ) -> impl Iterator<Item = SearchResult> + 'a {
        let indices = self.sorted_indices(&params.sort);
        let query_lower = params.query.as_ref().map(|q| q.to_lowercase());
        let tld_filter: Option<FxHashSet<&str>> = params
            .tlds
            .as_ref()
            .map(|t| t.iter().map(|s| s.as_str()).collect());
        let length_filter: Option<FxHashSet<usize>> =
            params.lengths.as_ref().map(|l| l.iter().copied().collect());
        let tld_prefix = &params.tld_prefix;

        indices.iter().flat_map(move |&idx| {
            let entry = &self.entries[idx];
            if !Self::word_matches(entry, &query_lower, &length_filter) {
                return Vec::new();
            }
            self.matching_tlds(entry, &tld_filter, tld_prefix)
                .into_iter()
                .map(|tld| SearchResult {
                    name: format!("{}{}", entry.word, tld),
                    tld: tld.to_string(),
                    length: entry.length,
                })
                .collect::<Vec<_>>()
        })
    }

    fn word_matches(
        entry: &IndexedEntry,
        query_lower: &Option<String>,
        length_filter: &Option<FxHashSet<usize>>,
    ) -> bool {
        if let Some(q) = query_lower {
            if !entry.word.starts_with(q.as_str()) {
                return false;
            }
        }
        if let Some(lengths) = length_filter {
            if !lengths.contains(&entry.length) {
                return false;
            }
        }
        true
    }
}
