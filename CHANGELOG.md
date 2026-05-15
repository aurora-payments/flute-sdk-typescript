# Changelog

## 0.1.3

### Patch Changes

- a82dd82: Fix: remove `/isv-api` prefix from the ISV API base URL.

  Versions `0.1.0` through `0.1.2` shipped with sandbox / production
  defaults that included `/isv-api/` as a path prefix on the ISV BFF
  host:

  ```
  https://api.uat.arise.risewithaurora.com/isv-api
  https://api.arise.risewithaurora.com/isv-api
  ```

  Live verification against UAT (with valid sandbox credentials)
  confirmed that path returns `404 Not Found` on every endpoint that
  flows through `flute.transactions.*` and `flute.settings.*`. The
  correct host root is just:

  ```
  https://api.uat.arise.risewithaurora.com
  https://api.arise.risewithaurora.com
  ```

  The `/isv-api/` segment that appears in URLs like

  ```
  api.uat.arise.risewithaurora.com/isv-api/swagger/v2/swagger.json
  ```

  is the path of the **Swagger UI**, not a prefix of the API itself.
  The OpenAPI spec consumed during type generation declares paths as
  `/v2/transactions`, `/v2/settings/payment-config`, etc., which the
  SDK already appends to `baseUrls.isvApi` — so dropping the misread
  prefix from the default brings the constructed URLs in line with
  what the API actually serves.

  Scope of the impact:
  - `transactions.list`, `transactions.retrieve`, `transactions.sale`,
    `transactions.authorize`, `transactions.capture`, `transactions.void`,
    `transactions.refund`, `transactions.calculateAmount` were all
    unreachable on default `baseUrls`.
  - `settings.getPaymentSettings` was unreachable on default `baseUrls`.
  - `paymentSessions.*` was unaffected — `pay-int-api` really is mounted
    under that path on the host.
  - OAuth was unaffected — the token endpoint lives on a dedicated
    `oauth.*` host.
  - Anyone passing custom `baseUrls.isvApi` was unaffected (the override
    is taken verbatim).

  Why the unit tests didn't catch it: the existing MSW-based tests were
  written against the URLs the SDK _constructed_, not against the URLs
  the live host actually exposes. They asserted
  `https://example.test/isv-api/v2/transactions` because that's what the
  SDK produced; the bug was hiding inside both halves of the assertion
  at the same time. The fix in this changeset:
  1. Drops `/isv-api` from `SANDBOX_DEFAULTS.isvApi` and
     `PRODUCTION_DEFAULTS.isvApi` in `src/environment.ts`.
  2. Updates `tests/smoke.test.ts` to assert the correct hostname
     (it now acts as a regression guard if anyone tries to bring the
     prefix back).
  3. Updates `tests/resources.test.ts` MSW fixtures to match the new
     shape so they continue to exercise the realistic URL.
  4. Updates the README's environments table and the Aspire / preview-
     ring override examples.

  End-to-end validation will be re-run from the external smoke harness
  (`flute-sdk-smoke`) once `0.1.3` lands on npm. The harness already
  has the OAuth handshake, payment-config read, transactions list, and
  calculateAmount call wired against the live UAT host; the only thing
  keeping them from going green is that they consume `0.1.2` from the
  registry.

  Recommended action for any consumer who already shipped against
  `0.1.0` / `0.1.1` / `0.1.2`: bump to `0.1.3`. If you couldn't make any
  ISV API call work before, this is why.

## 0.1.2

### Patch Changes

- 1076f7c: Internal release plumbing: migrate npm publishing to OIDC Trusted
  Publisher (no runtime changes).

  Before this release the GitHub Actions release workflow authenticated
  to npm with a long-lived `NPM_TOKEN` granular access token. Two
  practical limits surfaced when publishing under that model:
  1. The token had to be rotated periodically (90-day expiration), which
     introduced a recurring operational task and a window where releases
     could silently start failing if rotation was missed.
  2. With provenance enabled, `npm publish --provenance` from CI was
     rejected by the registry with an opaque `E404 Not Found` even
     though the OIDC attestation was correctly signed and uploaded to
     the public Sigstore transparency log. The same publish without
     provenance from a workstation succeeded, which isolated the failure
     to the token + provenance + registry interaction.

  Switching to npm Trusted Publishers solves both: GitHub Actions
  authenticates to npm via short-lived OIDC tokens scoped to a specific
  `{org, repo, workflow}` triple; no `NPM_TOKEN` secret lives in the
  repository; provenance attestations are accepted natively because the
  OIDC identity is the same one signing the attestation.

  The publisher is registered at
  <https://www.npmjs.com/package/@flute-payments/sdk/access>:
  - Provider: GitHub Actions
  - Organization: `aurora-payments`
  - Repository: `flute-sdk-typescript`
  - Workflow filename: `release.yml`

  This is the first release expected to land on npm with full OIDC
  provenance signature visible on the package web UI.

## 0.1.1

### Patch Changes

- 8884847: CI publish + provenance bootstrap validation. No runtime changes.

  The first release (`0.1.0`) was published manually from a workstation
  because the very first `npm publish` against a brand-new npm scope with
  provenance enabled is rejected by the registry with an opaque
  `E404 Not Found` (a long-standing quirk where the registry has no
  package container yet to attach the OIDC attestation to). This patch
  release exists to validate that, now that the scope `@flute-payments`
  is bootstrapped on the registry, the GitHub Actions release workflow
  can publish with full sigstore provenance via the `id-token: write`
  OIDC flow as designed.

  If you're verifying the SDK end-to-end, install `0.1.1` (or later) to
  get the version with provenance signature visible on the npm web UI
  and at the transparency log
  (<https://search.sigstore.dev/?logIndex=...>).

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
