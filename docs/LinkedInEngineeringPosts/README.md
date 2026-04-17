# LinkedIn engineering posts

Builder-persona posts for hiring managers and peer engineers clicking through from a resume. Each post should demonstrate a distinct engineering muscle using the same codebase, so the corpus reads as "this person reasons across layers" rather than "this person knows one trick."

Folder-wide writing rules live in `AGENTS.md` at the repo root, so they load into every session automatically. Short version: no em-dashes, no "X is not Y, it's Z" cadence unless it really earns it, keep the numbers loud, first person, audience is peer engineers and technical hiring managers.

## Post roadmap (different muscles per post)

- Algorithmic reasoning. In progress as `leetcode_matters_at_scale.md`.
- System design judgment. Why ArcSwap for the index swap. Why Cloudflare Tunnel instead of Nginx.
- Debugging and investigation. A weird bug story, when one shows up worth writing about.
- Engineering pragmatism. Using a local LLM instead of Claude for the 370K word tagging, because cost.
- Trade-off articulation. What I chose not to build and why. "No tests in this project" is a defensible position if framed well.

## Files in this folder

- `leetcode_matters_at_scale.md`: post 1, algorithmic reasoning. In progress.
- `leetcode_meta_lines.md`: reservoir of strong lines for post 1. Plug and unplug during iteration.
- `IO_bound_vs_cpu_bound.md`: post candidate, resource management. Closest to shippable after post 1.
- `Double_buffer_problem.md`: post candidate, concurrency and atomic index swap.
- `http_is_stream_of_bytes_over_tcp.md`: post candidate, protocol level. Skeletal.
- `when_we_need_sse_vs_rest.md`: merge into the HTTP post when that one is drafted. Not standalone.

## Cadence plan

One post at a time. Ship, let it sit for about a week, read how it lands, then start the next. No point writing post 2 before post 1 has been in the world long enough to calibrate against real signal.

Three to four posts across a few months reads as an active engineer. One post and silence reads as abandoned. The log stays alive on cadence, not volume.
