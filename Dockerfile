ARG BINARY_SOURCE=builder
ARG BINARY_PATH=target/release/mcpm

FROM rust:1.90-alpine AS builder

RUN apk add --no-cache \
  build-base \
  musl-dev \
  pkgconfig

WORKDIR /app

COPY src-tauri/ ./src-tauri/
COPY Cargo.toml ./
COPY Cargo.lock ./

RUN cargo build --manifest-path src-tauri/Cargo.toml --release \
  && cp /app/target/release/mcpm /usr/local/bin/mcpm

FROM alpine:3.22 AS prebuilt
ARG PREBUILT_PATH
COPY ${PREBUILT_PATH} /usr/local/bin/mcpm

FROM ${BINARY_SOURCE} AS binary_source

FROM alpine:3.22 AS release

RUN apk add --no-cache ca-certificates

COPY --from=binary_source /usr/local/bin/mcpm /usr/local/bin/mcpm

WORKDIR /data
ENTRYPOINT ["mcpm"]
