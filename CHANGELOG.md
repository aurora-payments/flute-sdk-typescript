# Changelog

All notable changes to `@flute-payments/sdk` are documented here. Format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

Generated entries below this point come from the
[changesets](https://github.com/changesets/changesets) workflow on
release. Manual edits should stay above the auto-generated section.

## [Unreleased]

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
  + full jitter retries (5xx / 429 / network), `Retry-After`
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
