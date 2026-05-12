---
'@flute-payments/sdk': minor
---

PRD v1.2 alignment pass — closes the gaps that surfaced when auditing
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
