# ADR 0004: Run generation as asynchronous, idempotent jobs

Status: accepted

Date: 2026-08-05

## Context

Hosted image generation can take longer than a normal request and may be retried by web or chat clients. A retry must not create duplicate versions or charges.

## Decision

Creation and generative revision run as asynchronous jobs identified by a client request ID. Repeating the same authorized request ID returns the same job outcome. Entitlements are reserved at job start, settled only after validated success, and released on failure or cancellation.

## Consequences

The platform needs job states, retry policy, transactional settlement, and durable request IDs. Clients poll or subscribe to job status instead of holding one tool call open indefinitely.
