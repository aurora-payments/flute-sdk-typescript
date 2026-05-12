# Changelog

## 0.1.0

### Minor Changes

- 9cb292b: Phase 1: full implementation of every method on the public surface.
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

- 9cb292b: PRD v1.2 alignment pass — closes the gaps that surfaced when auditing
  Phase 1 against the updated PRD. Backwards-compatible additions only.

  **Bug fixes**
  - OAuth host corrected to the dedicated `oauth.{uat,}.arise.risewithaurora.com`
    (PRD §FR-2.2). The previous `api.{uat,}.arise.risewithaurora.com/identity`
    base resolves to a 404 in UAT; the SDK would have failed every request.
    Probed live (DNS + `POST /oauth2/token`) before changing.

  **Added**
  - `FluteWebhookError` — thrown by `verifySignature` when verification
    cannot even be attempted (missing/blank header, parsed JSON instead
    of raw bytes). PRD §FR-4.3 + §FR-5.4. Cryptographic mismatches still
    return `false`.
  - `verifyWebhookSignature` and `flute.webhooks.verifySignature` now
    also accept the PRD-literal positional form
    `(signatureHeader, idHeader, timestampHeader, rawRequestBody, signatureSecret, options?)`
    alongside the object form.
  - `Environment` const enum (`Environment.Sandbox` / `Environment.Production`)
    per PRD §5.1 — string literals still work.
  - `tokenRefreshBufferSeconds` config option (default 60) per PRD §FR-6.3.
  - `retryOn429` config option (default `false`) — PRD §5.3 marks 429
    retry as out of scope, so the SDK now surfaces `FluteRateLimitError`
    fast and lets the caller decide. Opt in for the previous behaviour.
  - HTTPS enforcement on every `baseUrls.*` (PRD §NFR-1). Loopback hosts
    (`localhost`, `127.0.0.1`, `[::1]`) keep accepting plain HTTP for
    local contract tests.
  - Examples 02 (list transactions), 03 (payment sessions), 04 (error
    handling) round out the runnable example set.
  - README rewritten with a "How to test it" section covering the unit
    suite, UAT examples, and the local-pack smoke test, plus the five
    ISV recipes mandated by PRD §FR-8.4.

  **Coverage** — 90.99 % statements, 82.75 % branches, 97.75 % functions,
  92.87 % lines on a 90-test suite (up from 75). Above the
  80 % / 75 % gate.

All notable changes to `@flute-payments/sdk` are documented here. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

Generated entries below this point come from the
[changesets](https://github.com/changesets/changesets) workflow on
release. Manual edits should stay above the auto-generated section.

## [Unreleased]

### Added — PRD v1.2 alignment pass

- **Bug fix:** OAuth host corrected to the dedicated
  `oauth.{uat,}.arise.risewithaurora.com` per PRD §FR-2.2 (the previous
  `api.../identity` URL is 404 in UAT).
- `FluteWebhookError` — thrown by `verifySignature` on missing or
  malformed parameters (PRD §FR-4.3, §FR-5.4).
- `verifyWebhookSignature` now also accepts the PRD-literal positional
  form alongside the object form.
- `Environment` const enum (`Environment.Sandbox` / `.Production`).
- `tokenRefreshBufferSeconds` config option (default 60s).
- `retryOn429` config option (default `false` — PRD §5.3 out-of-scope).
- HTTPS enforced on every `baseUrls.*`; loopback hosts exempt.
- Runnable examples: `02-list-transactions`, `03-payment-sessions`,
  `04-error-handling`.
- README "How to test it" section + the five ISV recipes mandated by
  PRD §FR-8.4.

### Added — Phase 1 (live transport + every method wired)

- **Auth** — `flute.sessions.{init, authenticate, getAccessToken,
refreshAccessToken, clearStoredToken}` with OAuth 2.0
  `client_credentials` + `refresh_token` grants against
  `/oauth2/token`; race-safe token coalescing; proactive + reactive
  refresh; pluggable `TokenStorage`.
- **Transactions** — `list`, `retrieve`, `sale`, `authorize`,
  `capture`, `void`, `refund`, `calculateAmount`. State-changing
  requests carry an auto-generated `Idempotency-Key`; callers may
  override it per-request.
- **Payment Sessions** — `create`, `retrieve`, `cancel` against the
  Payment Integrations v1 API; accepts string and numeric `mode`.
- **Settings** — `getPaymentSettings` returns the full merchant
  config verbatim from the ISV BFF v2 OpenAPI spec.
- **Webhooks** — `verifySignature` with HMAC-SHA256, timing-safe
  compare, and a configurable replay window. Cross-checked bit-for-bit
  against the backend `WebhookHmacService` test vectors.
- **Transport** — `fetch` wrapper with timeouts, exponential backoff
  - full jitter retries (5xx / 429 / network), `Retry-After`
    honouring, structured `FluteError` hierarchy with full error
    envelope (`requestId`, `correlationId`, `errorCode`, `payload`),
    sensitive-field redaction in logger output.
- **Types** — generated from the live `isv-api-v2.json` OpenAPI spec
  via `openapi-typescript`; pay-int-api types hand-rolled from the
  YAML schemas in `arise-docs`.
- **Tests** — 75 unit tests, ≥80% statements / ≥75% branches enforced
  via Vitest + MSW.

### Added — Phase 0 (scaffolding)

- Repository bootstrap: TypeScript 5, ESM + CJS dual build via tsup,
  vitest, eslint v9 flat config, prettier, husky + lint-staged + commitlint,
  changesets, GitHub Actions CI/CD with npm provenance.
- Public API surface locked: `Flute` constructor, four namespaces
  (`transactions`, `paymentSessions`, `settings`, `webhooks`), error
  hierarchy, `TokenStorage` interface, and `MemoryTokenStorage` default.
- Documentation skeleton: README with quick start, public API surface
  list, configuration reference, and environment table.
- Contribution and security policies (CONTRIBUTING, SECURITY,
  CODE_OF_CONDUCT, CODEOWNERS).
