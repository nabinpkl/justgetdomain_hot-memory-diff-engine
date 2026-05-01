FROM rust:1.87-slim AS builder

WORKDIR /app

# Build context is the repo root so the workspace can resolve.
# All examples must be copied because the workspace manifest lists each
# of them as a member; missing manifests fail Cargo's workspace load.
COPY Cargo.toml Cargo.lock ./
COPY crates/ ./crates/
COPY examples/ ./examples/

RUN cargo build --release -p domain-availability --bin server

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/server /app/server

EXPOSE 8001

ENTRYPOINT ["/app/server"]
