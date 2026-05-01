# breach-password-check

A tiny CLI that checks candidate password hashes against a sorted [HIBP-style](https://haveibeenpwned.com/Passwords) corpus and prints how many times each candidate has appeared in known breaches.

## What this example proves

`streaming-set-diff` (the workspace library this consumes) is generic. The domain-availability example uses it on `name.tld` lines; this one uses it on `HASH:COUNT` lines. Same `LineParser` trait, same `diff_sorted` algorithm, completely different file format and value type. If the abstraction wasn't real, this couldn't exist.

## Run against the sample data

```bash
cargo run -p breach-password-check -- \
  --corpus     examples/breach-password-check/data/sample-corpus.txt \
  --candidates examples/breach-password-check/data/sample-candidates.txt
```

Expected output:

```
0000000000000000000000000000000000000001  pwned: 5 times
1111111111111111111111111111111111111111  pwned: 3 times
5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8  pwned: 99999 times
CAFECAFECAFECAFECAFECAFECAFECAFECAFECAFE  not found
DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF  not found
```

## Use it for real

The sample corpus is six synthetic lines for demonstration. For real lookups, point `--corpus` at the [HIBP Pwned Passwords download](https://haveibeenpwned.com/Passwords) (multi-GB, sorted). The CLI streams it via `mmap`; nothing is held on the Rust heap apart from the candidate set and the matched results.

## What's actually happening

1. Load candidates (one hash per line) into an `FxHashSet<String>`.
2. `mmap` the corpus.
3. `streaming_set_diff::diff_sorted` binary-searches the corpus per candidate, walks forward to collect breach counts.
4. Print one line per candidate: `<HASH>  pwned: N times` or `<HASH>  not found`.

For the 5 candidates × 6-line sample, the binary-search asymptotic doesn't matter. For 5 candidates × the 850M-line real HIBP file, it's the difference between a millisecond per lookup and reading every line.

## Tests

```bash
cargo test -p breach-password-check
```

Four tests cover: matched candidate returns count, missing candidate lands in unmatched, mixed input, empty candidates.
