---
'@flute-payments/sdk': minor
---

Phase 1: full implementation of every method on the public surface.

- **Auth (`flute.sessions.*`)** — OAuth 2.0 client_credentials with
  proactive + reactive refresh, race-safe token coalescing, pluggable
  `TokenStorage` (default in-memory, swap for Redis/KV in serverless).
- **Transactions (`flute.transactions.*`)** — `list`, `retrieve`,
  `sale`, `authorize`, `capture`, `void`, `refund`, `calculateAmount`,
  with idempotency keys generated automatically for every state change.
- **Payment Sessions (`flute.paymentSessions.*`)** — `create`,
  `retrieve`, `cancel` against the Payment Integrations v1 API, with
  string and numeric `mode` accepted.
- **Settings (`flute.settings.getPaymentSettings`)** — merchant
  payment configuration verbatim from the ISV BFF v2 OpenAPI spec.
- **Webhooks (`flute.webhooks.verifySignature`)** — HMAC-SHA256 with
  timing-safe compare and a configurable replay window; cross-checked
  bit-for-bit against the backend `WebhookHmacService` test vectors.
- **Transport** — `fetch` wrapper with timeouts, exponential backoff +
  full jitter retries (5xx / 429 / network errors), `Retry-After`
  honouring, structured error hierarchy, and sensitive-field redaction
  on logs.
- **Tooling** — types generated from the live `isv-api-v2.json`
  OpenAPI spec via `openapi-typescript`; ≥80% coverage enforced by
  Vitest with MSW-driven HTTP mocks.

Refs: ARISE-1845, ARISE-2288.
