FROM rust:1.87-slim AS builder

WORKDIR /app

# Build context is the repo root so the workspace can resolve.
# Copy only the Rust workspace members listed in the root Cargo.toml.
# The frontend lives under examples/ but is NOT a workspace member;
# copying examples/ wholesale would bust this layer on every frontend
# change and force a full cargo rebuild.
COPY Cargo.toml Cargo.lock ./
COPY crates/ ./crates/
COPY examples/domain-availability/backend/ ./examples/domain-availability/backend/
COPY examples/breach-password-check/ ./examples/breach-password-check/

RUN cargo build --release -p domain-availability --bin server

FROM debian:bookworm-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/server /app/server

EXPOSE 8001

ENTRYPOINT ["/app/server"]
