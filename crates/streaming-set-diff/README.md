# streaming-set-diff

Single-pass set-difference over a sorted source streamed line-by-line.

## What it is

Given:

- A small **candidate set** that fits in RAM (`FxHashSet<String>`).
- A large **source** on disk (possibly many GB), line-delimited, where each line carries a key + value.

This crate produces:

- For each matched candidate, the list of values the source associated with it.
- The set of candidates the source never mentioned (the actual *set difference*).

You bring a [`LineParser`] impl that knows your line format; the crate handles streaming, candidate lookup, and accumulation.

## Two algorithms, same output

The crate ships two functions with identical input and output contracts. Pick by your I/O shape:

| Function           | Source type | Time                       | Requires sorted source? | When to use                                                                  |
|--------------------|-------------|----------------------------|-------------------------|------------------------------------------------------------------------------|
| `diff()`           | `BufRead`   | O(n + k)                   | No                      | Stream is unsorted, or you can't `mmap` (gz/xz pipe, network).               |
| `diff_sorted()`    | `&[u8]`     | O(k · log n + matches)     | Yes                     | Source is sorted by parsed key and you can `mmap` it. Minutes → seconds.     |

n = source bytes, k = candidates, matches = total per-candidate value count.

For the original use case (5.6 GB of registered domains, ~10 K candidates, source pre-sorted), `diff_sorted` does ~k · log₂(n) ≈ 10⁴ · 33 ≈ 330 K comparisons + a forward walk per candidate, vs `diff` reading every one of ~3·10⁸ lines.

Output of the two functions is byte-identical for any well-formed sorted input — see the `parity_diff_and_diff_sorted_match` test.

## Space + I/O

- **Space:** O(k × v) where v = average values per matched candidate. The source is **never** held on the Rust heap; `diff_sorted` relies on the OS page cache via `mmap`.
- **I/O:** sequential for `diff`; random-access (mmap) for `diff_sorted`. Both are single-pass through the matching regions.

## Example

```rust
use std::io::Cursor;
use rustc_hash::FxHashSet;
use streaming_set_diff::{diff, LineParser};

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

let source = "apple:red\nbanana:yellow\napple:green\n";
let candidates: FxHashSet<String> =
    ["apple", "banana", "kiwi"].iter().map(|s| s.to_string()).collect();

let result = diff(Cursor::new(source), &ColonParser, &candidates).unwrap();
assert_eq!(result.matched_count(), 2);     // apple, banana
assert_eq!(result.unmatched_count(), 1);   // kiwi
```

## What it isn't

- **Not sort-aware.** A future impl could exploit sorted input to binary-search candidates rather than scanning every line. The current impl is O(n) so the algorithm fits one screen.
- **Not parallel.** A future impl could shard the source by byte range. Not done here.
- **Not async.** Sync `Read` / `BufRead`. The batch is I/O bound on sequential reads; async wouldn't speed it up.
- **Not a parser.** Bring your own [`LineParser`] — we handle streaming, you handle line format.

Pair with [`hot-index`](../hot-index) to serve the result, and `snapshot-rdb` (sibling crate) to persist it across restarts.
