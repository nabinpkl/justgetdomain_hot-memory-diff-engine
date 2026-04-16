use rustc_hash::FxHashSet;
use std::time::Instant;
use tracing::info;

use crate::categories::Categories;
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
    /// Curated category IDs this word belongs to. Populated from
    /// `backend/data/wordlist.json`. Empty for words that aren't curated.
    categories: Vec<String>,
}

pub struct DomainIndex {
    entries: Vec<IndexedEntry>,
    all_tlds: Vec<String>,
    by_alpha: Vec<usize>,
    by_tld_count: Vec<usize>,
    by_shortest: Vec<usize>,
    total_available: usize,
}

#[derive(Debug)]
pub struct SearchParams {
    pub query: Option<String>,
    pub tlds: Option<Vec<String>>,
    pub tld_prefix: Option<String>,
    pub lengths: Option<Vec<usize>>,
    pub available_band: Option<AvailableBand>,
    pub sort: SortMode,
    /// OR-semantics: an entry passes if any of its categories is in this set.
    /// `None` means the filter is off.
    pub categories: Option<Vec<String>>,
}

#[derive(Debug, Default)]
pub enum SortMode {
    #[default]
    Alpha,
    Tlds,
    Shortest,
    Random(u64),
}

#[derive(Debug, Clone, Copy)]
pub enum AvailableBand {
    Single, // exactly 1 TLD available (after TLD filter)
    Few,    // 2-3
    Many,   // 4+
}

/// One row = one name with its matching TLDs, capped at MAX_TLDS_PER_RESULT.
/// `match_count` is the true post-filter count so the UI can render "+N more"
/// without shipping the full list (some names have 900+ available TLDs).
#[derive(serde::Serialize)]
pub struct SearchResult {
    pub name: String,
    pub tlds: Vec<String>,
    pub length: usize,
    pub match_count: usize,
}

pub const MAX_TLDS_PER_RESULT: usize = 12;

impl DomainIndex {
    pub fn from_snapshot(snapshot: &Snapshot, categories: &Categories) -> Self {
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
                    categories: categories.categories_for(&entry.word).to_vec(),
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
        let total_available: usize = entries.iter().map(|e| e.available_count).sum();
        let elapsed = start.elapsed();
        info!(count, tld_count, total_available, ?elapsed, "domain index built");

        Self {
            entries,
            all_tlds,
            by_alpha,
            by_tld_count,
            by_shortest,
            total_available,
        }
    }

    /// Return all TLDs in priority-ranked order.
    pub fn all_tlds(&self) -> &[String] {
        &self.all_tlds
    }

    /// Number of indexed entries (words with at least one available TLD).
    pub fn entries_len(&self) -> usize {
        self.entries.len()
    }

    /// Sum of available TLDs across all entries (total registrable name+TLD pairs).
    pub fn total_available(&self) -> usize {
        self.total_available
    }

    fn sorted_indices(&self, sort: &SortMode) -> &[usize] {
        match sort {
            SortMode::Alpha => &self.by_alpha,
            SortMode::Tlds => &self.by_tld_count,
            SortMode::Shortest => &self.by_shortest,
            // `/stream` can't cheaply yield a seeded permutation; falls back
            // to alpha. `/search` handles Random ahead of this call.
            SortMode::Random(_) => &self.by_alpha,
        }
    }

    fn random_ordering(&self, seed: u64) -> Vec<usize> {
        use std::hash::Hasher;
        let mut v: Vec<usize> = (0..self.entries.len()).collect();
        v.sort_by_cached_key(|&idx| {
            let mut h = rustc_hash::FxHasher::default();
            h.write_u64(seed);
            h.write(self.entries[idx].word.as_bytes());
            h.finish()
        });
        v
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

    /// Paginated grouped search. Each row = one name with its available TLDs.
    pub fn search(
        &self,
        params: &SearchParams,
        offset: usize,
        limit: usize,
    ) -> (usize, usize, Vec<SearchResult>) {
        let random_indices: Vec<usize>;
        let indices: &[usize] = match &params.sort {
            SortMode::Random(seed) => {
                random_indices = self.random_ordering(*seed);
                &random_indices
            }
            other => self.sorted_indices(other),
        };
        let query_lower = params.query.as_ref().map(|q| q.to_lowercase());
        let tld_filter: Option<FxHashSet<&str>> = params
            .tlds
            .as_ref()
            .map(|t| t.iter().map(|s| s.as_str()).collect());
        let length_filter: Option<FxHashSet<usize>> =
            params.lengths.as_ref().map(|l| l.iter().copied().collect());
        let category_filter: Option<FxHashSet<&str>> = params
            .categories
            .as_ref()
            .map(|c| c.iter().map(|s| s.as_str()).collect());

        let mut total = 0usize;
        let mut total_combos = 0usize;
        let mut results = Vec::with_capacity(limit);
        let end = offset + limit;

        for &idx in indices {
            let entry = &self.entries[idx];

            if !Self::word_matches(entry, &query_lower, &length_filter, &category_filter) {
                continue;
            }

            let tlds = self.matching_tlds(entry, &tld_filter, &params.tld_prefix);
            if tlds.is_empty() {
                continue;
            }

            if !band_matches(tlds.len(), &params.available_band) {
                continue;
            }

            let match_count = tlds.len();
            total_combos += match_count;

            if total >= offset && total < end {
                let capped: Vec<String> = tlds
                    .into_iter()
                    .take(MAX_TLDS_PER_RESULT)
                    .map(|t| t.to_string())
                    .collect();
                results.push(SearchResult {
                    name: entry.word.clone(),
                    tlds: capped,
                    length: entry.length,
                    match_count,
                });
            }
            total += 1;
        }

        (total, total_combos, results)
    }

    /// Streaming grouped search.
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
        let category_filter: Option<FxHashSet<&str>> = params
            .categories
            .as_ref()
            .map(|c| c.iter().map(|s| s.as_str()).collect());
        let tld_prefix = &params.tld_prefix;
        let band = &params.available_band;

        indices.iter().filter_map(move |&idx| {
            let entry = &self.entries[idx];
            if !Self::word_matches(entry, &query_lower, &length_filter, &category_filter) {
                return None;
            }
            let tlds = self.matching_tlds(entry, &tld_filter, tld_prefix);
            if tlds.is_empty() {
                return None;
            }
            if !band_matches(tlds.len(), band) {
                return None;
            }
            let match_count = tlds.len();
            let capped: Vec<String> = tlds
                .into_iter()
                .take(MAX_TLDS_PER_RESULT)
                .map(|t| t.to_string())
                .collect();
            Some(SearchResult {
                name: entry.word.clone(),
                tlds: capped,
                length: entry.length,
                match_count,
            })
        })
    }

    /// Paginated list of every available TLD for a single name.
    /// Powers the "+N more" modal on the frontend. Linear scan is fine here;
    /// the dictionary is ~10K entries and this is called only on explicit drill-in.
    pub fn tlds_for(&self, name: &str, offset: usize, limit: usize) -> Option<(usize, Vec<String>)> {
        let entry = self.entries.iter().find(|e| e.word == name)?;
        let available: Vec<&String> = self
            .all_tlds
            .iter()
            .filter(|tld| !entry.registered_tlds.contains(tld.as_str()))
            .collect();
        let total = available.len();
        let end = (offset + limit).min(total);
        let slice = if offset >= total {
            Vec::new()
        } else {
            available[offset..end].iter().map(|s| s.to_string()).collect()
        };
        Some((total, slice))
    }

    fn word_matches(
        entry: &IndexedEntry,
        query_lower: &Option<String>,
        length_filter: &Option<FxHashSet<usize>>,
        category_filter: &Option<FxHashSet<&str>>,
    ) -> bool {
        if let Some(q) = query_lower {
            if !entry.word.starts_with(q.as_str()) {
                return false;
            }
        }
        if let Some(lengths) = length_filter {
            // Highest selected length acts as ">=" so the UI's "8+" bucket
            // captures all longer words without enumerating each length.
            let max = lengths.iter().copied().max().unwrap_or(0);
            let in_set = lengths.contains(&entry.length);
            let in_tail = entry.length > max;
            if !(in_set || in_tail) {
                return false;
            }
        }
        if let Some(cats) = category_filter {
            // OR-semantics: passing any selected category is enough.
            if !entry.categories.iter().any(|c| cats.contains(c.as_str())) {
                return false;
            }
        }
        true
    }
}

fn band_matches(count: usize, band: &Option<AvailableBand>) -> bool {
    match band {
        None => true,
        Some(AvailableBand::Single) => count == 1,
        Some(AvailableBand::Few) => count >= 2 && count <= 3,
        Some(AvailableBand::Many) => count >= 4,
    }
}
