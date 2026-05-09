# `src/types/`

Hand-rolled DTOs that mirror the Arise/Flute REST API contract, plus a
`generated/` subfolder produced by `npm run openapi:types` (see Phase 1).

Naming convention:

- camelCase on the wire-facing TS side; JSON `snake_case` payloads are
  remapped at the HTTP boundary.
- Each resource has its own file (`transactions.ts`, `paymentSessions.ts`,
  `settings.ts`, `webhooks.ts`).
- Types intended for consumers are re-exported from `src/index.ts`.

The codegen strategy chosen for Phase 1 is **B**: hand-rolled methods on
top of `openapi-typescript`-generated DTOs. See ARISE-2288 for the
rationale.
