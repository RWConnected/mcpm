FROM rust:1.90-alpine AS builder

RUN apk add --no-cache \
  build-base \
  musl-dev \
  pkgconfig

WORKDIR /app

COPY src-tauri/ ./src-tauri/
COPY Cargo.toml ./
COPY Cargo.lock ./

RUN cargo build --manifest-path src-tauri/Cargo.toml --release
FROM alpine:3.22 AS release

RUN apk add --no-cache ca-certificates
COPY --from=builder /app/target/release/mcpm /usr/local/bin/mcpm

WORKDIR /data
ENTRYPOINT ["mcpm"]
