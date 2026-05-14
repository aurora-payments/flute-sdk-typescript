---
'@flute-payments/sdk': patch
---

Fix: remove `/isv-api` prefix from the ISV API base URL.

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
written against the URLs the SDK *constructed*, not against the URLs
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
