//! Single-pass set-difference over a sorted source streamed line-by-line.
//!
//! # The shape of the problem
//!
//! You have:
//!
//! - A small **candidate set** that fits in RAM (thousands to low millions
//!   of keys).
//! - A large **source** on disk, possibly many GB, where each line carries
//!   a key plus an associated value. The source is typically pre-sorted
//!   by key so all records for the same key sit on consecutive lines —
//!   but this crate doesn't require that for correctness, only the
//!   downstream batch tooling does.
//!
//! You want, for each candidate, the list of values the source associates
//! with it (often empty). Plus the list of candidates the source never
//! mentioned — the *set difference*.
//!
//! # The algorithm
//!
//! [`diff`] streams the source one line at a time, never loading it whole:
//!
//! 1. Per line: ask the [`LineParser`] for a cheap key view (`&str`) and
//!    skip the line if the key isn't a candidate. This filter runs on
//!    every line of the source so it has to be cheap.
//! 2. On a hit: ask the parser for the full value and append it to the
//!    candidate's accumulator.
//! 3. After the stream ends: candidates with no matches are the
//!    "unmatched" set.
//!
//! Asymptotic behavior:
//!
//! - **Time:** O(n + k) where n = lines in the source and k = matched
//!   candidates. Dominated by n in practice.
//! - **Space:** O(k * v) where v = average values per matched candidate.
//!   The source is never held in memory.
//! - **I/O:** sequential, single-pass — the source can be `mmap`'d or
//!   read through a `BufReader` over an `xz`-decompressed pipe; the
//!   crate doesn't care.
//!
//! Use [`hot_index`](https://docs.rs/hot-index) to publish the result.
//! Use `snapshot-rdb` (sibling crate) to persist it across restarts.
//!
//! # What this crate is not
//!
//! - **Not sort-aware.** A future impl could exploit sorted input to
//!   binary-search candidates rather than scanning every line. The
//!   current impl is intentionally O(n) so the algorithm fits one
//!   screen and doesn't depend on a particular sort key.
//! - **Not parallel.** A future impl could shard the source by byte
//!   range and merge per-shard `HashMap`s. Not done here.
//! - **Not async.** Sync `Read` + `BufRead`. The batch is I/O bound on
//!   sequential reads; async wouldn't speed it up.

use std::collections::HashMap;
use std::io::{self, BufRead};

use rustc_hash::FxHashSet;

/// Pluggable parser for a single line of the source.
///
/// Implementors handle delimiters, encoding, and per-record validation.
/// The trait splits the parse into two phases so the hot path (every
/// line of a multi-GB source) can short-circuit before paying for value
/// extraction.
pub trait LineParser {
    /// The value associated with each matched line.
    type Value;

    /// Cheap key extraction. Called on **every** line of the source.
    /// Return `None` to skip the line entirely (malformed, comment, etc.).
    /// The returned `&str` must be a borrow of `line` so this method
    /// allocates nothing on the hot path.
    fn parse_key<'a>(&self, line: &'a [u8]) -> Option<&'a str>;

    /// Full value extraction. Called only when [`parse_key`] returned a
    /// candidate hit, so this can do heavier work (UTF-8 validation,
    /// integer parsing, etc.). Return `None` to drop the record (e.g.
    /// the value side was malformed even though the key matched).
    fn parse_value(&self, line: &[u8]) -> Option<Self::Value>;
}

/// Output of a [`diff`] run.
#[derive(Debug)]
pub struct DiffResult<V> {
    /// Every candidate the source mentioned at least once, with the full
    /// list of values seen. Iteration order is unspecified.
    pub matches: HashMap<String, Vec<V>>,

    /// Every candidate the source never mentioned. Iteration order is
    /// unspecified — sort downstream if needed.
    pub unmatched: Vec<String>,
}

impl<V> DiffResult<V> {
    pub fn matched_count(&self) -> usize {
        self.matches.len()
    }

    pub fn unmatched_count(&self) -> usize {
        self.unmatched.len()
    }
}

/// Stream `source` line-by-line and produce per-candidate value lists
/// plus the unmatched candidate set.
///
/// `source` must be line-delimited by `\n`; trailing `\r` is stripped
/// before the parser sees it (so CRLF input works without parser
/// changes).
///
/// # Errors
///
/// Returns the first I/O error encountered while reading `source`.
/// Lines that the parser rejects (returns `None` from either method)
/// are silently skipped — the parser is the policy authority on what
/// counts as malformed.
pub fn diff<R, P>(
    source: R,
    parser: &P,
    candidates: &FxHashSet<String>,
) -> io::Result<DiffResult<P::Value>>
where
    R: BufRead,
    P: LineParser,
{
    let mut matches: HashMap<String, Vec<P::Value>> = HashMap::with_capacity(candidates.len() / 4);

    for line in source.split(b'\n') {
        let mut line = line?;
        if line.last() == Some(&b'\r') {
            line.pop();
        }

        let Some(key) = parser.parse_key(&line) else {
            continue;
        };

        if !candidates.contains(key) {
            continue;
        }

        let Some(value) = parser.parse_value(&line) else {
            continue;
        };

        // `key` borrows from `line`; we have to allocate to outlive the
        // loop iteration. The allocation cost is paid only on a hit,
        // not on every source line.
        matches
            .entry(key.to_string())
            .or_insert_with(|| Vec::with_capacity(1))
            .push(value);
    }

    let unmatched: Vec<String> = candidates
        .iter()
        .filter(|c| !matches.contains_key(c.as_str()))
        .cloned()
        .collect();

    Ok(DiffResult { matches, unmatched })
}

/// Sort-aware variant of [`diff`].
///
/// Same input/output contract as [`diff`], but instead of scanning every
/// line of the source, this function binary-searches the source per
/// candidate and walks forward to collect contiguous values.
///
/// **The source MUST be sorted by parsed key.** If the parser produces
/// keys that are not in ascending byte order across consecutive lines,
/// results are unspecified (lines may be missed).
///
/// # When to use this over [`diff`]
///
/// - Source: `O(k · log n + matches)` where k = candidates, n = source
///   bytes. For k = 10⁴ and n = 5 GB this is seconds vs minutes for the
///   linear variant.
/// - Source must be `&[u8]` (typically `mmap`'d) — we need random
///   access. [`diff`] takes any [`BufRead`] which is more flexible.
///
/// Output is byte-identical to [`diff`] for any well-formed sorted
/// input. The included `parity_diff_and_diff_sorted_match` test asserts
/// this on a hand-built corpus.
pub fn diff_sorted<P>(
    source: &[u8],
    parser: &P,
    candidates: &FxHashSet<String>,
) -> DiffResult<P::Value>
where
    P: LineParser,
{
    let mut matches: HashMap<String, Vec<P::Value>> =
        HashMap::with_capacity(candidates.len() / 4);

    // Sort candidates so the binary searches walk the source in
    // ascending order — better cache locality on huge mmap'd files.
    let mut sorted: Vec<&str> = candidates.iter().map(String::as_str).collect();
    sorted.sort_unstable();

    for cand in sorted {
        let start = lower_bound_line(source, parser, cand);
        let mut pos = start;
        let mut bucket: Vec<P::Value> = Vec::new();

        while pos < source.len() {
            let line_end = find_newline(source, pos);
            let line = strip_cr(&source[pos..line_end]);
            pos = skip_past_newline(source, line_end);

            match parser.parse_key(line) {
                None => continue,
                Some(key) if key == cand => {
                    if let Some(value) = parser.parse_value(line) {
                        bucket.push(value);
                    }
                }
                Some(key) if key < cand => {
                    // Binary search overshot or malformed cluster; skip.
                    continue;
                }
                Some(_) => break,
            }
        }

        if !bucket.is_empty() {
            matches.insert(cand.to_string(), bucket);
        }
    }

    let unmatched: Vec<String> = candidates
        .iter()
        .filter(|c| !matches.contains_key(c.as_str()))
        .cloned()
        .collect();

    DiffResult { matches, unmatched }
}

/// Binary-search the source for the byte offset of the first line whose
/// parsed key is `>= target`. Lines the parser rejects are skipped
/// forward.
fn lower_bound_line<P: LineParser>(data: &[u8], parser: &P, target: &str) -> usize {
    let mut lo: usize = 0;
    let mut hi: usize = data.len();

    while lo < hi {
        let mid = lo + (hi - lo) / 2;
        let line_start = snap_to_line_start(data, mid);
        let line_end = find_newline(data, line_start);
        let line = strip_cr(&data[line_start..line_end]);

        match parser.parse_key(line) {
            None => {
                // Skip past this malformed line and keep searching the
                // upper half. This can be wrong if many malformed lines
                // cluster on a boundary; acceptable for the trusted-batch
                // use case the crate is built for.
                lo = skip_past_newline(data, line_end);
            }
            Some(key) if key < target => {
                lo = skip_past_newline(data, line_end);
            }
            Some(_) => {
                hi = line_start;
            }
        }
    }

    lo
}

/// Snap `pos` back to the start of the line that contains it.
fn snap_to_line_start(data: &[u8], pos: usize) -> usize {
    if pos == 0 || pos > data.len() {
        return 0;
    }
    let mut i = pos.min(data.len() - 1);
    while i > 0 && data[i - 1] != b'\n' {
        i -= 1;
    }
    i
}

/// Position of the newline at or after `pos`, or `data.len()` if none.
fn find_newline(data: &[u8], pos: usize) -> usize {
    let mut i = pos;
    while i < data.len() && data[i] != b'\n' {
        i += 1;
    }
    i
}

/// Position of the byte after the newline at `pos`, or `data.len()`.
fn skip_past_newline(data: &[u8], pos: usize) -> usize {
    if pos < data.len() && data[pos] == b'\n' {
        pos + 1
    } else {
        data.len()
    }
}

/// Strip a trailing `\r` (CRLF input). Operates on a borrowed slice so
/// it allocates nothing on the hot path.
fn strip_cr(line: &[u8]) -> &[u8] {
    if line.last() == Some(&b'\r') {
        &line[..line.len() - 1]
    } else {
        line
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Cursor;

    /// Parser for `key:value` lines — string key, string value.
    /// Used to exercise the trait surface with a non-default impl.
    struct ColonParser;

    impl LineParser for ColonParser {
        type Value = String;

        fn parse_key<'a>(&self, line: &'a [u8]) -> Option<&'a str> {
            let dot = line.iter().position(|&b| b == b':')?;
            std::str::from_utf8(&line[..dot]).ok()
        }

        fn parse_value(&self, line: &[u8]) -> Option<String> {
            let dot = line.iter().position(|&b| b == b':')?;
            std::str::from_utf8(&line[dot + 1..]).ok().map(str::to_owned)
        }
    }

    /// Parser that mimics the domain-availability shape: `name.tld`
    /// with `name` as key, `tld` as value. Demonstrates that the same
    /// trait surface fits a different delimiter.
    struct DotParser;

    impl LineParser for DotParser {
        type Value = String;

        fn parse_key<'a>(&self, line: &'a [u8]) -> Option<&'a str> {
            let dot = line.iter().position(|&b| b == b'.')?;
            std::str::from_utf8(&line[..dot]).ok()
        }

        fn parse_value(&self, line: &[u8]) -> Option<String> {
            let dot = line.iter().position(|&b| b == b'.')?;
            std::str::from_utf8(&line[dot + 1..]).ok().map(str::to_owned)
        }
    }

    fn candidates(words: &[&str]) -> FxHashSet<String> {
        words.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn hand_computed_diff() {
        let source = "apple:red\nbanana:yellow\napple:green\ncherry:red\n";
        let cands = candidates(&["apple", "banana", "kiwi"]);
        let result = diff(Cursor::new(source), &ColonParser, &cands).unwrap();

        assert_eq!(result.matched_count(), 2);
        assert_eq!(result.unmatched_count(), 1);

        let apple = result.matches.get("apple").unwrap();
        let mut apple_sorted = apple.clone();
        apple_sorted.sort();
        assert_eq!(apple_sorted, vec!["green".to_string(), "red".to_string()]);

        assert_eq!(result.matches.get("banana").unwrap(), &vec!["yellow".to_string()]);
        assert!(!result.matches.contains_key("cherry"));
        assert_eq!(result.unmatched, vec!["kiwi".to_string()]);
    }

    #[test]
    fn custom_parser_with_different_delimiter() {
        let source = "apple.com\napple.io\nbanana.dev\n";
        let cands = candidates(&["apple", "banana", "missing"]);
        let result = diff(Cursor::new(source), &DotParser, &cands).unwrap();

        assert_eq!(result.matches.get("apple").unwrap().len(), 2);
        assert_eq!(result.matches.get("banana").unwrap(), &vec!["dev".to_string()]);
        assert_eq!(result.unmatched, vec!["missing".to_string()]);
    }

    #[test]
    fn empty_source_marks_everything_unmatched() {
        let cands = candidates(&["a", "b", "c"]);
        let result = diff(Cursor::new(""), &ColonParser, &cands).unwrap();

        assert_eq!(result.matched_count(), 0);
        assert_eq!(result.unmatched_count(), 3);
        let mut um = result.unmatched.clone();
        um.sort();
        assert_eq!(um, vec!["a".to_string(), "b".to_string(), "c".to_string()]);
    }

    #[test]
    fn empty_candidates_drops_everything() {
        let source = "apple:red\nbanana:yellow\n";
        let cands = FxHashSet::default();
        let result = diff(Cursor::new(source), &ColonParser, &cands).unwrap();
        assert_eq!(result.matched_count(), 0);
        assert_eq!(result.unmatched_count(), 0);
    }

    #[test]
    fn all_candidates_match_leaves_no_unmatched() {
        let source = "a:1\nb:2\nc:3\n";
        let cands = candidates(&["a", "b", "c"]);
        let result = diff(Cursor::new(source), &ColonParser, &cands).unwrap();
        assert_eq!(result.matched_count(), 3);
        assert_eq!(result.unmatched_count(), 0);
    }

    #[test]
    fn duplicate_keys_in_source_accumulate() {
        // Same key seen 5 times → 5 values.
        let source = "x:1\nx:2\nx:3\nx:4\nx:5\n";
        let cands = candidates(&["x"]);
        let result = diff(Cursor::new(source), &ColonParser, &cands).unwrap();
        assert_eq!(result.matches.get("x").unwrap().len(), 5);
    }

    #[test]
    fn crlf_line_endings_handled() {
        let source = "apple:red\r\nbanana:yellow\r\n";
        let cands = candidates(&["apple", "banana"]);
        let result = diff(Cursor::new(source), &ColonParser, &cands).unwrap();
        // Without \r stripping, the key "apple" vs "apple\r" wouldn't
        // match the candidate set. Verify it does.
        assert_eq!(result.matched_count(), 2);
        assert_eq!(result.matches.get("apple").unwrap(), &vec!["red".to_string()]);
    }

    #[test]
    fn malformed_lines_skipped_silently() {
        // Lines without `:` get rejected by ColonParser.parse_key.
        let source = "garbage line no delimiter\napple:red\nmore garbage\n";
        let cands = candidates(&["apple"]);
        let result = diff(Cursor::new(source), &ColonParser, &cands).unwrap();
        assert_eq!(result.matched_count(), 1);
        assert_eq!(result.matches.get("apple").unwrap(), &vec!["red".to_string()]);
    }

    #[test]
    fn candidate_not_in_source_lands_in_unmatched() {
        let source = "apple:red\n";
        let cands = candidates(&["apple", "ghost"]);
        let result = diff(Cursor::new(source), &ColonParser, &cands).unwrap();
        assert_eq!(result.matched_count(), 1);
        assert_eq!(result.unmatched, vec!["ghost".to_string()]);
    }

    // ----------------------------------------------------------------
    //  diff_sorted (binary-search variant) tests
    // ----------------------------------------------------------------

    /// Normalize a [`DiffResult`] for comparison: sort each value bucket
    /// and the unmatched list. `diff` and `diff_sorted` both have
    /// unspecified iteration order so direct equality requires a sort.
    fn normalize<V: Ord + Clone>(r: &DiffResult<V>) -> (Vec<(String, Vec<V>)>, Vec<String>) {
        let mut m: Vec<(String, Vec<V>)> = r
            .matches
            .iter()
            .map(|(k, v)| {
                let mut vs = v.clone();
                vs.sort();
                (k.clone(), vs)
            })
            .collect();
        m.sort_by(|a, b| a.0.cmp(&b.0));
        let mut u = r.unmatched.clone();
        u.sort();
        (m, u)
    }

    #[test]
    fn diff_sorted_hand_computed() {
        // Sorted by name. Apple has two TLDs, banana has one, dev is
        // not a candidate.
        let source = "apple.com\napple.io\nbanana.dev\ndev.tools\n";
        let cands = candidates(&["apple", "banana", "ghost"]);
        let result = diff_sorted(source.as_bytes(), &DotParser, &cands);

        let apple = result.matches.get("apple").unwrap();
        let mut apple_sorted = apple.clone();
        apple_sorted.sort();
        assert_eq!(apple_sorted, vec!["com".to_string(), "io".to_string()]);
        assert_eq!(result.matches.get("banana").unwrap(), &vec!["dev".to_string()]);
        assert!(!result.matches.contains_key("dev"));
        assert_eq!(result.unmatched, vec!["ghost".to_string()]);
    }

    #[test]
    fn parity_diff_and_diff_sorted_match() {
        // Same hand-built sorted corpus through both functions; results
        // must be byte-identical after normalization.
        let source = "\
apple.com
apple.io
apple.net
banana.dev
banana.org
cherry.app
date.io
elderberry.com
fig.dev
grape.com
grape.io
grape.net
";
        let cands = candidates(&[
            "apple",
            "banana",
            "cherry",
            "fig",
            "grape",
            "ghost",     // unmatched
            "missing",   // unmatched
        ]);

        let linear = diff(Cursor::new(source), &DotParser, &cands).unwrap();
        let sorted = diff_sorted(source.as_bytes(), &DotParser, &cands);
        assert_eq!(normalize(&linear), normalize(&sorted));
    }

    #[test]
    fn diff_sorted_candidate_before_first_line() {
        let source = "mango.com\nmango.io\n";
        let cands = candidates(&["aardvark"]);
        let result = diff_sorted(source.as_bytes(), &DotParser, &cands);
        assert_eq!(result.matched_count(), 0);
        assert_eq!(result.unmatched, vec!["aardvark".to_string()]);
    }

    #[test]
    fn diff_sorted_candidate_after_last_line() {
        let source = "apple.com\nbanana.dev\n";
        let cands = candidates(&["zebra"]);
        let result = diff_sorted(source.as_bytes(), &DotParser, &cands);
        assert_eq!(result.matched_count(), 0);
        assert_eq!(result.unmatched, vec!["zebra".to_string()]);
    }

    #[test]
    fn diff_sorted_single_line_source() {
        let source = "apple.com\n";
        let cands = candidates(&["apple", "banana"]);
        let result = diff_sorted(source.as_bytes(), &DotParser, &cands);
        assert_eq!(result.matches.get("apple").unwrap(), &vec!["com".to_string()]);
        assert_eq!(result.unmatched, vec!["banana".to_string()]);
    }

    #[test]
    fn diff_sorted_contiguous_values_for_one_candidate() {
        // 50 contiguous values for the same key — verify the forward
        // walk picks them all up after binary search lands.
        let mut s = String::new();
        for i in 0..50 {
            s.push_str(&format!("apple.tld{i:02}\n"));
        }
        // Add a different candidate to make sure the walk stops.
        s.push_str("banana.com\n");
        let cands = candidates(&["apple", "banana"]);
        let result = diff_sorted(s.as_bytes(), &DotParser, &cands);
        assert_eq!(result.matches.get("apple").unwrap().len(), 50);
        assert_eq!(result.matches.get("banana").unwrap(), &vec!["com".to_string()]);
    }

    #[test]
    fn diff_sorted_no_trailing_newline() {
        // Last line is not newline-terminated.
        let source = "apple.com\nbanana.dev";
        let cands = candidates(&["apple", "banana"]);
        let result = diff_sorted(source.as_bytes(), &DotParser, &cands);
        assert_eq!(result.matches.get("apple").unwrap(), &vec!["com".to_string()]);
        assert_eq!(result.matches.get("banana").unwrap(), &vec!["dev".to_string()]);
    }

    #[test]
    fn diff_sorted_handles_crlf() {
        let source = "apple.com\r\nbanana.dev\r\n";
        let cands = candidates(&["apple", "banana"]);
        let result = diff_sorted(source.as_bytes(), &DotParser, &cands);
        assert_eq!(result.matches.get("apple").unwrap(), &vec!["com".to_string()]);
        assert_eq!(result.matches.get("banana").unwrap(), &vec!["dev".to_string()]);
    }
}
