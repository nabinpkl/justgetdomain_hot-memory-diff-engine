use rustc_hash::{FxHashMap, FxHashSet};
use std::time::Instant;
use tracing::info;

use crate::categories::Categories;
use crate::snapshot::Snapshot;

/// TLDs the product wants to surface first in combo/grid results.
const SURFACED_TLDS: &[&str] = &[".ai", ".sh", ".dev", ".tech", ".me", ".site", ".space"];

/// TLDs shown individually in the UI, in priority sort order.
/// Index position = sort rank. Everything else comes after, alphabetically.
pub const DISPLAY_TLDS: &[&str] = &[
    ".ai", ".sh", ".dev", ".tech", ".me", ".site", ".space", ".com", ".io", ".app", ".xyz",
    ".net", ".org", ".studio", ".academy", ".desgin", ".bio", ".work", ".to", ".tube",
    ".online", ".one", ".new", ".name", ".inc", ".host", ".fun", ".fm", ".food",
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
    precomputed_combo_totals: FxHashMap<String, usize>,
}

#[derive(Debug)]
pub struct SearchParams {
    pub query: Option<String>,
    pub tlds: Option<Vec<String>>,
    pub tld_prefix: Option<String>,
    pub lengths: Option<Vec<usize>>,
    /// Lower bound for `entry.length` (inclusive). Combines with `lengths`
    /// using OR: an entry passes if it matches `lengths` exactly OR its
    /// length is >= `min_length`. Enables "N+" buckets in UI without
    /// contaminating exact-length filters (e.g. 3-letter shelf).
    pub min_length: Option<usize>,
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
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

        let precomputed_combo_totals = build_precomputed_combo_totals(&entries, &all_tlds);
        let count = entries.len();
        let total_available: usize = entries.iter().map(|e| e.available_count).sum();
        let elapsed = start.elapsed();
        let precomputed_totals = precomputed_combo_totals.len();
        info!(count, tld_count, total_available, precomputed_totals, ?elapsed, "domain index built");

        Self {
            entries,
            all_tlds,
            by_alpha,
            by_tld_count,
            by_shortest,
            total_available,
            precomputed_combo_totals,
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

    fn combo_multiplier(seed: u64, total: usize) -> usize {
        use std::hash::Hasher;

        if total <= 1 {
            return 1;
        }

        let mut h = rustc_hash::FxHasher::default();
        h.write_u64(seed);
        h.write_u64(0x9e37_79b9_7f4a_7c15);

        let mut candidate = ((h.finish() as usize) | 1) % total;
        if candidate == 0 {
            candidate = 1;
        }
        while gcd(candidate, total) != 1 {
            candidate = (candidate + 2) % total;
            if candidate == 0 {
                candidate = 1;
            }
        }
        candidate
    }

    fn combo_addend(seed: u64, total: usize) -> usize {
        use std::hash::Hasher;

        if total == 0 {
            return 0;
        }

        let mut h = rustc_hash::FxHasher::default();
        h.write_u64(seed);
        h.write_u64(0xbf58_476d_1ce4_e5b9);
        (h.finish() as usize) % total
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
        let min_length = params.min_length;
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

            if !Self::word_matches(
                entry,
                &query_lower,
                &length_filter,
                &min_length,
                &category_filter,
            ) {
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

    /// Paginated combo search. Each row = one available name+TLD pair.
    /// Random mode uses an affine permutation over the filtered combo ordinal
    /// space, so pagination can jump through millions of pairs without
    /// materializing and sorting every pair.
    pub fn search_combos(
        &self,
        params: &SearchParams,
        offset: usize,
        limit: usize,
    ) -> (usize, usize, Vec<SearchResult>) {
        if offset == 0 && limit <= 18 {
            if let Some(total) = self.precomputed_combo_total(params) {
                if total == 0 {
                    return (0, 0, Vec::new());
                }
                if let SortMode::Random(seed) = params.sort {
                    return (
                        total,
                        total,
                        self.fast_first_combo_page(params, seed, limit),
                    );
                }
            }
        }

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
        let min_length = params.min_length;
        let category_filter: Option<FxHashSet<&str>> = params
            .categories
            .as_ref()
            .map(|c| c.iter().map(|s| s.as_str()).collect());

        let mut surfaced_matching = Vec::new();
        let mut surfaced_cumulative = Vec::new();
        let mut other_matching = Vec::new();
        let mut other_cumulative = Vec::new();
        let mut total_names = 0usize;
        let mut total_combos = 0usize;
        let mut surfaced_combos = 0usize;
        let mut other_combos = 0usize;

        for &idx in indices {
            let entry = &self.entries[idx];

            if !Self::word_matches(
                entry,
                &query_lower,
                &length_filter,
                &min_length,
                &category_filter,
            ) {
                continue;
            }

            let tlds = self.matching_tlds(entry, &tld_filter, &params.tld_prefix);
            if tlds.is_empty() {
                continue;
            }

            if !band_matches(tlds.len(), &params.available_band) {
                continue;
            }

            total_names += 1;
            total_combos += tlds.len();

            let surfaced_count = tlds
                .iter()
                .filter(|tld| is_surfaced_tld(tld))
                .count();
            let other_count = tlds.len() - surfaced_count;
            if surfaced_count > 0 {
                surfaced_combos += surfaced_count;
                surfaced_matching.push(idx);
                surfaced_cumulative.push(surfaced_combos);
            }
            if other_count > 0 {
                other_combos += other_count;
                other_matching.push(idx);
                other_cumulative.push(other_combos);
            }
        }

        if total_combos == 0 || offset >= total_combos {
            return (total_combos, total_combos, Vec::new());
        }

        let start = offset;
        let end = (offset + limit).min(total_combos);
        let mut results = Vec::with_capacity(end - start);

        match &params.sort {
            SortMode::Random(seed) => {
                for ordinal in start..end {
                    let (pool_ordinal, pool_total, matching, cumulative, surfaced_only) =
                        if ordinal < surfaced_combos {
                            (
                                ordinal,
                                surfaced_combos,
                                surfaced_matching.as_slice(),
                                surfaced_cumulative.as_slice(),
                                true,
                            )
                        } else {
                            (
                                ordinal - surfaced_combos,
                                other_combos,
                                other_matching.as_slice(),
                                other_cumulative.as_slice(),
                                false,
                            )
                        };
                    let multiplier = Self::combo_multiplier(*seed, pool_total);
                    let addend = Self::combo_addend(*seed, pool_total);
                    let permuted = (pool_ordinal
                        .wrapping_mul(multiplier)
                        .wrapping_add(addend))
                        % pool_total;
                    if let Some(result) = self.combo_at(
                        permuted,
                        matching,
                        cumulative,
                        &tld_filter,
                        params,
                        surfaced_only,
                    )
                    {
                        results.push(result);
                    }
                }
            }
            _ => {
                for ordinal in start..end {
                    let (pool_ordinal, matching, cumulative, surfaced_only) =
                        if ordinal < surfaced_combos {
                            (
                                ordinal,
                                surfaced_matching.as_slice(),
                                surfaced_cumulative.as_slice(),
                                true,
                            )
                        } else {
                            (
                                ordinal - surfaced_combos,
                                other_matching.as_slice(),
                                other_cumulative.as_slice(),
                                false,
                            )
                        };
                    if let Some(result) = self.combo_at(
                        pool_ordinal,
                        matching,
                        cumulative,
                        &tld_filter,
                        params,
                        surfaced_only,
                    )
                    {
                        results.push(result);
                    }
                }
            }
        }

        debug_assert!(total_names <= total_combos);
        (total_combos, total_combos, results)
    }

    fn precomputed_combo_total(&self, params: &SearchParams) -> Option<usize> {
        combo_total_key(params)
            .and_then(|key| self.precomputed_combo_totals.get(&key).copied())
    }

    fn fast_first_combo_page(
        &self,
        params: &SearchParams,
        seed: u64,
        limit: usize,
    ) -> Vec<SearchResult> {
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

        let mut results = Vec::with_capacity(limit);
        let mut attempts = 0usize;
        let max_attempts = self.entries.len().saturating_mul(2).max(limit);
        let multiplier = Self::combo_multiplier(seed, self.entries.len());
        let addend = Self::combo_addend(seed, self.entries.len());

        while results.len() < limit && attempts < max_attempts {
            let idx = (attempts.wrapping_mul(multiplier).wrapping_add(addend)) % self.entries.len();
            attempts += 1;

            let entry = &self.entries[idx];
            if !Self::word_matches(
                entry,
                &None,
                &length_filter,
                &None,
                &category_filter,
            ) {
                continue;
            }

            let tlds = self.matching_tlds(entry, &tld_filter, &None);
            if tlds.is_empty() || !band_matches(tlds.len(), &params.available_band) {
                continue;
            }

            if let Some(tld) = tlds.iter().copied().find(|tld| is_surfaced_tld(tld)) {
                results.push(SearchResult {
                    name: entry.word.clone(),
                    tlds: vec![tld.to_string()],
                    length: entry.length,
                    match_count: 1,
                });
            }
        }

        if results.len() < limit {
            for entry in &self.entries {
                if results.len() >= limit {
                    break;
                }
                if !Self::word_matches(entry, &None, &length_filter, &None, &category_filter) {
                    continue;
                }
                let tlds = self.matching_tlds(entry, &tld_filter, &None);
                if tlds.is_empty() || !band_matches(tlds.len(), &params.available_band) {
                    continue;
                }
                if let Some(tld) = tlds
                    .iter()
                    .copied()
                    .find(|tld| is_surfaced_tld(tld))
                    .or_else(|| tlds.first().copied())
                {
                    results.push(SearchResult {
                        name: entry.word.clone(),
                        tlds: vec![tld.to_string()],
                        length: entry.length,
                        match_count: 1,
                    });
                }
            }
        }

        results
    }

    fn combo_at(
        &self,
        ordinal: usize,
        matching: &[usize],
        cumulative: &[usize],
        tld_filter: &Option<FxHashSet<&str>>,
        params: &SearchParams,
        surfaced_only: bool,
    ) -> Option<SearchResult> {
        let entry_pos = cumulative.partition_point(|&end| end <= ordinal);
        let entry_idx = *matching.get(entry_pos)?;
        let entry = &self.entries[entry_idx];
        let previous_end = if entry_pos == 0 {
            0
        } else {
            cumulative[entry_pos - 1]
        };
        let tld_offset = ordinal - previous_end;
        let tld = self
            .matching_tlds(entry, tld_filter, &params.tld_prefix)
            .into_iter()
            .filter(|tld| is_surfaced_tld(tld) == surfaced_only)
            .collect::<Vec<_>>()
            .get(tld_offset)?
            .to_string();

        Some(SearchResult {
            name: entry.word.clone(),
            tlds: vec![tld],
            length: entry.length,
            match_count: 1,
        })
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
        let min_length = params.min_length;
        let category_filter: Option<FxHashSet<&str>> = params
            .categories
            .as_ref()
            .map(|c| c.iter().map(|s| s.as_str()).collect());
        let tld_prefix = &params.tld_prefix;
        let band = &params.available_band;

        indices.iter().filter_map(move |&idx| {
            let entry = &self.entries[idx];
            if !Self::word_matches(
                entry,
                &query_lower,
                &length_filter,
                &min_length,
                &category_filter,
            ) {
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
        min_length: &Option<usize>,
        category_filter: &Option<FxHashSet<&str>>,
    ) -> bool {
        if let Some(q) = query_lower {
            if !entry.word.starts_with(q.as_str()) {
                return false;
            }
        }
        // `lengths` is an exact-match set. `min_length` opens an open-ended
        // ">=" tail so the UI's "N+" bucket doesn't force us to enumerate
        // every possible word length. Combined with OR semantics.
        if length_filter.is_some() || min_length.is_some() {
            let in_set = length_filter
                .as_ref()
                .is_some_and(|s| s.contains(&entry.length));
            let in_tail = min_length.is_some_and(|m| entry.length >= m);
            if !in_set && !in_tail {
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

fn build_precomputed_combo_totals(
    entries: &[IndexedEntry],
    all_tlds: &[String],
) -> FxHashMap<String, usize> {
    let shelf_filters = [
        (None, None::<Vec<&str>>),
        (Some(vec![3, 4, 5]), None),
        (None, Some(vec![".dev"])),
        (None, Some(vec![".ai"])),
    ];
    let tech_shelf = (
        None::<Vec<usize>>,
        Some(vec![".dev", ".tech", ".ai"]),
        Some(vec!["tech"]),
    );
    let tld_chips = [".ai", ".sh", ".dev", ".tech", ".me", ".site", ".space"];
    let length_filters = [None, Some(vec![4]), Some(vec![3, 4, 5])];
    let bands = [
        None,
        Some(AvailableBand::Single),
        Some(AvailableBand::Few),
        Some(AvailableBand::Many),
    ];
    let mut totals = FxHashMap::default();

    for tld_mask in 0..(1usize << tld_chips.len()) {
        let chip_tlds: Option<Vec<&str>> = if tld_mask == 0 {
            None
        } else {
            Some(
                tld_chips
                    .iter()
                    .enumerate()
                    .filter_map(|(idx, tld)| {
                        if tld_mask & (1usize << idx) == 0 {
                            None
                        } else {
                            Some(*tld)
                        }
                    })
                    .collect(),
            )
        };

        for (shelf_lengths, shelf_tlds) in shelf_filters.iter() {
            for length_filter in &length_filters {
                for band in &bands {
                    let lengths = length_filter
                        .clone()
                        .or_else(|| shelf_lengths.clone());
                    let tlds = merge_tld_slices(shelf_tlds.as_deref(), chip_tlds.as_deref());
                    insert_precomputed_total(
                        &mut totals,
                        entries,
                        all_tlds,
                        lengths,
                        tlds,
                        *band,
                        None,
                    );
                }
            }
        }

        for length_filter in &length_filters {
            for band in &bands {
                let tlds = merge_tld_slices(tech_shelf.1.as_deref(), chip_tlds.as_deref());
                insert_precomputed_total(
                    &mut totals,
                    entries,
                    all_tlds,
                    length_filter.clone(),
                    tlds,
                    *band,
                    tech_shelf.2.clone(),
                );
            }
        }
    }

    totals
}

fn insert_precomputed_total(
    totals: &mut FxHashMap<String, usize>,
    entries: &[IndexedEntry],
    all_tlds: &[String],
    lengths: Option<Vec<usize>>,
    tlds: Option<Vec<&str>>,
    available_band: Option<AvailableBand>,
    categories: Option<Vec<&str>>,
) {
    let params = SearchParams {
        query: None,
        tlds: tlds
            .as_ref()
            .map(|items| items.iter().map(|item| (*item).to_string()).collect()),
        tld_prefix: None,
        lengths,
        min_length: None,
        available_band,
        sort: SortMode::Alpha,
        categories: categories
            .as_ref()
            .map(|items| items.iter().map(|item| (*item).to_string()).collect()),
    };
    let Some(key) = combo_total_key(&params) else {
        return;
    };
    if totals.contains_key(&key) {
        return;
    }
    totals.insert(key, count_combo_total(entries, all_tlds, &params));
}

fn count_combo_total(entries: &[IndexedEntry], all_tlds: &[String], params: &SearchParams) -> usize {
    let tld_filter = params
        .tlds
        .as_ref()
        .map(|items| items.iter().map(String::as_str).collect::<Vec<_>>());
    let length_filter = params
        .lengths
        .as_ref()
        .map(|items| items.iter().copied().collect::<FxHashSet<_>>());
    let category_filter = params
        .categories
        .as_ref()
        .map(|items| items.iter().map(String::as_str).collect::<FxHashSet<_>>());

    entries
        .iter()
        .filter_map(|entry| {
            if !DomainIndex::word_matches(
                entry,
                &None,
                &length_filter,
                &None,
                &category_filter,
            ) {
                return None;
            }

            let count = if let Some(tlds) = &tld_filter {
                tlds.iter()
                    .filter(|tld| !entry.registered_tlds.contains(**tld))
                    .count()
            } else {
                let registered = entry.registered_tlds.len();
                all_tlds.len().saturating_sub(registered)
            };
            if count == 0 || !band_matches(count, &params.available_band) {
                None
            } else {
                Some(count)
            }
        })
        .sum()
}

fn merge_tld_slices<'a>(
    shelf_tlds: Option<&[&'a str]>,
    chip_tlds: Option<&[&'a str]>,
) -> Option<Vec<&'a str>> {
    match (shelf_tlds, chip_tlds) {
        (None, None) => None,
        (Some(shelf), None) => Some(shelf.to_vec()),
        (None, Some(chips)) => Some(chips.to_vec()),
        (Some(shelf), Some(chips)) => {
            let shelf_set: FxHashSet<&str> = shelf.iter().copied().collect();
            let merged: Vec<&str> = chips
                .iter()
                .copied()
                .filter(|tld| shelf_set.contains(tld))
                .collect();
            if merged.is_empty() {
                Some(vec!["__none__"])
            } else {
                Some(merged)
            }
        }
    }
}

fn combo_total_key(params: &SearchParams) -> Option<String> {
    if params.query.is_some() || params.tld_prefix.is_some() || params.min_length.is_some() {
        return None;
    }

    let mut parts = Vec::new();
    if let Some(tlds) = &params.tlds {
        let mut normalized = tlds.clone();
        normalized.sort();
        normalized.dedup();
        parts.push(format!("tlds={}", normalized.join(",")));
    } else {
        parts.push("tlds=*".to_string());
    }

    if let Some(lengths) = &params.lengths {
        let mut normalized = lengths.clone();
        normalized.sort_unstable();
        normalized.dedup();
        parts.push(format!(
            "lengths={}",
            normalized
                .iter()
                .map(usize::to_string)
                .collect::<Vec<_>>()
                .join(",")
        ));
    } else {
        parts.push("lengths=*".to_string());
    }

    let band = match params.available_band {
        None => "*",
        Some(AvailableBand::Single) => "1",
        Some(AvailableBand::Few) => "2-3",
        Some(AvailableBand::Many) => "4+",
    };
    parts.push(format!("available={band}"));

    if let Some(categories) = &params.categories {
        let mut normalized = categories.clone();
        normalized.sort();
        normalized.dedup();
        parts.push(format!("categories={}", normalized.join(",")));
    } else {
        parts.push("categories=*".to_string());
    }

    Some(parts.join("|"))
}

fn is_surfaced_tld(tld: &str) -> bool {
    SURFACED_TLDS.contains(&tld)
}

fn gcd(mut a: usize, mut b: usize) -> usize {
    while b != 0 {
        let next = a % b;
        a = b;
        b = next;
    }
    a
}
