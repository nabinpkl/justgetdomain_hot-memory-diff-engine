//! HIBP-style breach lookup: given a small set of candidate password
//! hashes and a giant sorted `HASH:COUNT` corpus, report which
//! candidates appear and how many times.
//!
//! This example exists to prove [`streaming_set_diff`] is generic  it
//! mirrors the domain-availability use case but with a totally
//! different file format and value type.

use rustc_hash::FxHashSet;
use streaming_set_diff::{DiffResult, LineParser, diff_sorted};

/// Parses HIBP-style lines: `<40-char SHA-1 hex>:<integer count>`.
///
/// Key = the hash. Value = the breach count. Lines without `:` or with
/// a non-integer count are silently rejected.
pub struct HibpParser;

impl LineParser for HibpParser {
    type Value = u32;

    fn parse_key<'a>(&self, line: &'a [u8]) -> Option<&'a str> {
        let colon = line.iter().position(|&b| b == b':')?;
        std::str::from_utf8(&line[..colon]).ok()
    }

    fn parse_value(&self, line: &[u8]) -> Option<u32> {
        let colon = line.iter().position(|&b| b == b':')?;
        let count_bytes = &line[colon + 1..];
        std::str::from_utf8(count_bytes).ok()?.trim().parse().ok()
    }
}

/// Run the breach check: sort-aware diff over the (assumed sorted)
/// `corpus` byte slice. Caller is responsible for `mmap`'ing or reading
/// the file.
pub fn check_passwords(
    corpus: &[u8],
    candidates: &FxHashSet<String>,
) -> DiffResult<u32> {
    diff_sorted(corpus, &HibpParser, candidates)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cands(items: &[&str]) -> FxHashSet<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    /// Small sorted HIBP-style corpus, hand-built. Sort order is
    /// byte-lexicographic on the hash prefix; `:COUNT` doesn't affect
    /// it because all keys are distinct.
    const CORPUS: &[u8] = b"\
0000000000000000000000000000000000000001:5
00000000000000000000000000000000000000A2:12
1111111111111111111111111111111111111111:3
5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8:99999
ABCDEF0123456789ABCDEF0123456789ABCDEF01:7
FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF:1
";

    #[test]
    fn matched_candidate_returns_breach_count() {
        let candidates = cands(&["5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"]);
        let result = check_passwords(CORPUS, &candidates);

        assert_eq!(result.matched_count(), 1);
        assert_eq!(result.unmatched_count(), 0);
        let counts = result
            .matches
            .get("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8")
            .expect("candidate should be matched");
        assert_eq!(counts, &vec![99999u32]);
    }

    #[test]
    fn missing_candidate_lands_in_unmatched() {
        let candidates = cands(&["DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF"]);
        let result = check_passwords(CORPUS, &candidates);

        assert_eq!(result.matched_count(), 0);
        assert_eq!(result.unmatched, vec!["DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF".to_string()]);
    }

    #[test]
    fn mixed_present_and_absent() {
        let candidates = cands(&[
            "5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8", // present, 99999
            "1111111111111111111111111111111111111111", // present, 3
            "DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF", // absent
            "0000000000000000000000000000000000000001", // present, 5
            "CAFECAFECAFECAFECAFECAFECAFECAFECAFECAFE", // absent
        ]);
        let result = check_passwords(CORPUS, &candidates);

        assert_eq!(result.matched_count(), 3);
        assert_eq!(result.unmatched_count(), 2);
        assert_eq!(
            result.matches.get("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8").unwrap(),
            &vec![99999u32]
        );
        assert_eq!(
            result.matches.get("1111111111111111111111111111111111111111").unwrap(),
            &vec![3u32]
        );
        assert_eq!(
            result.matches.get("0000000000000000000000000000000000000001").unwrap(),
            &vec![5u32]
        );
        let mut um = result.unmatched.clone();
        um.sort();
        assert_eq!(
            um,
            vec![
                "CAFECAFECAFECAFECAFECAFECAFECAFECAFECAFE".to_string(),
                "DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF".to_string(),
            ]
        );
    }

    #[test]
    fn empty_candidates_returns_nothing() {
        let result = check_passwords(CORPUS, &FxHashSet::default());
        assert_eq!(result.matched_count(), 0);
        assert_eq!(result.unmatched_count(), 0);
    }
}
