use rustc_hash::FxHashSet;
use std::time::Instant;
use tracing::info;

use crate::snapshot::Snapshot;

/// Compact entry — stores only the small registered set, not the huge available set.
#[derive(Debug)]
struct IndexedEntry {
    word: String,
    length: usize,
    registered_tlds: FxHashSet<String>,
    available_count: usize,
}

pub struct DomainIndex {
    /// All entries stored once. Sort orders reference into this by index.
    entries: Vec<IndexedEntry>,
    /// Every known TLD, dot-prefixed and sorted for consistent output.
    all_tlds: Vec<String>,
    /// Indices into `entries`, sorted alphabetically by word.
    by_alpha: Vec<usize>,
    /// Indices sorted by available TLD count descending.
    by_tld_count: Vec<usize>,
    /// Indices sorted by word length ascending.
    by_shortest: Vec<usize>,
}

#[derive(Debug)]
pub struct SearchParams {
    pub query: Option<String>,
    pub tlds: Option<Vec<String>>,
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

#[derive(serde::Serialize)]
pub struct SearchResult {
    pub word: String,
    pub tlds: Vec<String>,
    pub length: usize,
}

impl DomainIndex {
    pub fn from_snapshot(snapshot: &Snapshot) -> Self {
        let start = Instant::now();

        // Build dot-prefixed, sorted TLD list
        let mut all_tlds: Vec<String> = snapshot
            .all_tlds
            .iter()
            .map(|t| format!(".{t}"))
            .collect();
        all_tlds.sort();

        let all_tld_set: FxHashSet<&str> = all_tlds.iter().map(|s| s.as_str()).collect();
        let tld_count = all_tlds.len();

        let entries: Vec<IndexedEntry> = snapshot
            .entries
            .iter()
            .filter_map(|entry| {
                // Store registered TLDs dot-prefixed for easy lookup
                let registered: FxHashSet<String> = entry
                    .registered_tlds
                    .iter()
                    .map(|t| format!(".{t}"))
                    .collect();

                let available_count = tld_count - registered.len();
                if available_count == 0 {
                    return None;
                }

                // Data integrity: registered TLDs should be known
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

        // Build sort-order index arrays (just Vec<usize>, not cloned entries)
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

    fn sorted_indices(&self, sort: &SortMode) -> &[usize] {
        match sort {
            SortMode::Alpha => &self.by_alpha,
            SortMode::Tlds => &self.by_tld_count,
            SortMode::Shortest => &self.by_shortest,
        }
    }

    /// Compute available TLDs for an entry, optionally filtered.
    fn available_tlds(
        &self,
        entry: &IndexedEntry,
        tld_filter: &Option<FxHashSet<&str>>,
    ) -> Vec<String> {
        match tld_filter {
            Some(filter) => self
                .all_tlds
                .iter()
                .filter(|t| filter.contains(t.as_str()) && !entry.registered_tlds.contains(t.as_str()))
                .cloned()
                .collect(),
            None => self
                .all_tlds
                .iter()
                .filter(|t| !entry.registered_tlds.contains(t.as_str()))
                .cloned()
                .collect(),
        }
    }

    /// Paginated search: returns (total matching count, windowed results).
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
        let length_filter: Option<FxHashSet<usize>> = params
            .lengths
            .as_ref()
            .map(|l| l.iter().copied().collect());

        // First pass: count total matches
        let mut total = 0usize;
        for &idx in indices {
            if self.entry_matches(idx, &query_lower, &tld_filter, &length_filter) {
                total += 1;
            }
        }

        // Second pass: collect the window
        let results: Vec<SearchResult> = indices
            .iter()
            .filter(|&&idx| self.entry_matches(idx, &query_lower, &tld_filter, &length_filter))
            .skip(offset)
            .take(limit)
            .map(|&idx| {
                let entry = &self.entries[idx];
                let tlds = self.available_tlds(entry, &tld_filter);
                SearchResult {
                    word: entry.word.clone(),
                    tlds,
                    length: entry.length,
                }
            })
            .collect();

        (total, results)
    }

    /// Streaming search: returns an iterator over all matching results.
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
        let length_filter: Option<FxHashSet<usize>> = params
            .lengths
            .as_ref()
            .map(|l| l.iter().copied().collect());

        let tld_filter_clone = tld_filter.clone();
        indices
            .iter()
            .filter(move |&&idx| self.entry_matches(idx, &query_lower, &tld_filter, &length_filter))
            .map(move |&idx| {
                let entry = &self.entries[idx];
                let tlds = self.available_tlds(entry, &tld_filter_clone);
                SearchResult {
                    word: entry.word.clone(),
                    tlds,
                    length: entry.length,
                }
            })
    }

    fn entry_matches(
        &self,
        idx: usize,
        query_lower: &Option<String>,
        tld_filter: &Option<FxHashSet<&str>>,
        length_filter: &Option<FxHashSet<usize>>,
    ) -> bool {
        let entry = &self.entries[idx];

        if let Some(q) = query_lower {
            if !entry.word.contains(q.as_str()) {
                return false;
            }
        }

        if let Some(lengths) = length_filter {
            if !lengths.contains(&entry.length) {
                return false;
            }
        }

        // TLD filter: entry must have at least one requested TLD available
        if let Some(tlds) = tld_filter {
            if !tlds.iter().any(|t| !entry.registered_tlds.contains(*t)) {
                return false;
            }
        }

        true
    }
}
