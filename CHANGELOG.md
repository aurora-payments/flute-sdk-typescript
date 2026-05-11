# Changelog

All notable changes to `@getflute/sdk` are documented here. Format
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
