# `@flute-payments/sdk`

> **Status:** Phase 1 complete. Every method on the public surface is
> wired and tested against the live API contracts. Track delivery in
> [ARISE-1845](https://rwaapps.atlassian.net/browse/ARISE-1845).

Official **server-side** TypeScript / Node.js SDK for the Flute payment
platform. This package is the **reference implementation** for all
future Flute SDKs (Phase 2: PHP). Naming conventions, error model, and
documentation patterns established here become the contract every other
language SDK follows (PRD §1, §2.1).

> ⚠️ **Server-side only.** The SDK uses an OAuth client secret. Never
> ship it to a browser, mobile app, or any environment that can be
> inspected by an end user. PRD §3 (out of scope) and §NFR-1 require
> this.

## Table of contents

- [What's in scope (Phase 1)](#whats-in-scope-phase-1)
- [Install](#install)
- [Quick start (auth + sale)](#quick-start-auth--sale)
- [The 5 flows ISVs ask for](#the-5-flows-isvs-ask-for)
- [How to test it](#how-to-test-it)
- [Public API surface](#public-api-surface)
- [Configuration](#configuration)
- [Environments](#environments)
- [Errors](#errors)
- [Webhooks](#webhooks)
- [Compatibility](#compatibility)
- [Versioning & deprecation](#versioning--deprecation)

## What's in scope (Phase 1)

19 methods across 5 modules, plus webhook signature verification — the
minimum surface needed to cover the primary ISV integration use cases
(PRD §5.2):

| Module           | Methods                                                                                 | PRD §  |
| ---------------- | --------------------------------------------------------------------------------------- | ------ |
| Session          | `init`, `authenticate`, `getAccessToken`, `refreshAccessToken`, `clearStoredToken`      | FR-3.1 |
| Transactions     | `list`, `retrieve`, `authorize`, `sale`, `void`, `capture`, `refund`, `calculateAmount` | FR-3.2 |
| Payment Sessions | `create`, `retrieve`, `cancel`                                                          | FR-3.3 |
| Settings         | `getPaymentSettings`                                                                    | FR-3.4 |
| General          | `getVersion`                                                                            | FR-3.5 |
| Webhooks         | `verifySignature`                                                                       | FR-4   |

**Out of scope for Phase 1** (PRD §5.2): ACH transactions, customers,
subscriptions, invoices, quick payments, POS, devices, webhook
management. They will follow in later releases.

**Explicitly out of scope for every phase** (PRD §5.3): browser/UI
components, automatic 429 retry, pagination iterators, batch helpers,
multi-tenant credentials in a single instance.

## Install

```bash
npm install @flute-payments/sdk
```

> Requires Node `>=20.19.0`.

## Quick start (auth + sale)

```ts
import { Flute, Environment } from '@flute-payments/sdk';

const flute = new Flute({
  clientId: process.env.FLUTE_CLIENT_ID!,
  clientSecret: process.env.FLUTE_CLIENT_SECRET!,
  environment: Environment.Sandbox, // or 'sandbox' / 'production'
});

const result = await flute.transactions.sale({
  baseAmount: 100,
  currencyCode: 'USD',
  transactionDetails: {
    cardData: {
      paymentMethodDetails: {
        cardNumber: '4111111111111111',
        securityCode: '123',
        expirationMonth: 12,
        expirationYear: 2030,
      },
    },
  },
});

console.log(result.transactionId, result.transactionStatus);
```

## The 5 flows ISVs ask for

PRD §FR-8.4 mandates ready-to-paste recipes for the five most common
flows. Each one runs end-to-end against UAT with real sandbox credentials.

### 1. Authenticate + first sale

[See **`examples/01-quickstart.ts`**](./examples/01-quickstart.ts).

```ts
await flute.sessions.authenticate(); // surface bad creds at boot
const settings = await flute.settings.getPaymentSettings();
const result = await flute.transactions.sale({
  baseAmount: 100,
  currencyCode: 'USD',
  transactionDetails: {
    cardData: {
      paymentMethodDetails: {
        cardNumber: '4111111111111111',
        securityCode: '123',
        expirationMonth: 12,
        expirationYear: 2030,
      },
    },
  },
});
```

### 2. Token refresh transparency

The SDK acquires the OAuth token automatically before the first request
and refreshes it before expiry (60-second buffer by default). You don't
write any token plumbing — every call below is uninterrupted across
hours of activity:

```ts
// no boot ceremony required; Flute waits to fetch a token until
// the first API call. Optionally prime it:
await flute.sessions.authenticate();

// hours go by; the SDK refreshes proactively in the background
for (let i = 0; i < 1_000; i += 1) {
  const tx = await flute.transactions.list({ pageSize: 50, page: 1 });
  console.log(tx.total);
}

// for tests / forensic flows you can also drive the lifecycle manually:
await flute.sessions.refreshAccessToken();
await flute.sessions.clearStoredToken();
```

Out of the box the SDK uses an in-memory store. For multi-instance
deployments (Lambdas, K8s, Cloud Run) plug in your own store via
`tokenStorage` — see [Token storage](#token-storage).

### 3. Verify an incoming webhook

[See **`examples/05-webhook-verification.ts`**](./examples/05-webhook-verification.ts).

```ts
import { FluteWebhookError } from '@flute-payments/sdk';

app.post('/flute/webhooks', express.raw({ type: '*/*' }), (req, res) => {
  try {
    const ok = flute.webhooks.verifySignature({
      signatureHeader: req.headers['flute-webhook-signature'] as string,
      idHeader: req.headers['flute-webhook-id'] as string,
      timestampHeader: req.headers['flute-webhook-timestamp'] as string,
      rawRequestBody: req.body, // raw Buffer, NEVER JSON.stringify(req.body)
      signatureSecret: process.env.FLUTE_WEBHOOK_SECRET!,
    });
    if (!ok) return res.status(401).end(); // signature mismatch / replay
    // process the event, ack 200 quickly
    res.status(204).end();
  } catch (err) {
    if (err instanceof FluteWebhookError) {
      return res.status(400).send(err.message); // missing/malformed headers
    }
    throw err;
  }
});
```

The PRD also documents a positional form, useful when porting code from
other Flute SDKs:

```ts
flute.webhooks.verifySignature(sigHeader, idHeader, tsHeader, rawBody, secret);
```

### 4. List transactions

[See **`examples/02-list-transactions.ts`**](./examples/02-list-transactions.ts).

```ts
let page = 1;
const pageSize = 50;
const all: typeof response.items = [];

for (;;) {
  const response = await flute.transactions.list({ page, pageSize });
  all.push(...response.items);
  if (response.items.length < pageSize) break;
  if (all.length >= response.total) break;
  page += 1;
}

console.log(`${all.length} transactions / ${response.total} server-side`);
```

> The SDK doesn't ship a pagination iterator (PRD §5.3 — out of scope);
> the loop above is the canonical pattern.

### 5. Void a transaction

```ts
import { FluteApiError, FluteIdempotencyError } from '@flute-payments/sdk';

try {
  const voided = await flute.transactions.void('txn_123');
  console.log('voided →', voided.transactionStatus);
} catch (err) {
  if (err instanceof FluteIdempotencyError) {
    // a previous void attempt is in flight or settled differently — retry
    // the *retrieve* to inspect the canonical state, don't re-issue the void
  } else if (
    err instanceof FluteApiError &&
    err.payload?.errorCode === 'TRANSACTION_NOT_VOIDABLE'
  ) {
    // captured already — refund instead
  } else {
    throw err;
  }
}
```

## How to test it

Three complementary ways to validate the SDK end-to-end. All commands
assume you're at the repo root.

### A. Run the unit / contract test suite (no credentials required)

The test pack uses [MSW](https://mswjs.io/) to mock every HTTP call so
the suite is hermetic and runs in milliseconds. It covers happy paths,
the error hierarchy, retry behaviour, token coalescing, and webhook
verification (including a backend cross-check vector).

```bash
npm install
npm run verify           # lint • typecheck • test • build
# or step-by-step:
npm run lint
npm run typecheck
npm run test             # 84 tests, ~1s
npm run test:coverage    # generates ./coverage/, fails below 80% / 75%
npm run build            # ESM + CJS + .d.ts in ./dist
```

Coverage gates (`vitest.config.ts`): **statements ≥ 80 %**,
**branches ≥ 75 %**, **functions ≥ 90 %**, **lines ≥ 80 %**. CI fails the
PR if a regression drops below.

### B. Run the examples against UAT (sandbox credentials needed)

Provision a sandbox **Public Auth Client** in the Aurora dashboard.
You'll get a `clientId` / `clientSecret` pair and a webhook signing
secret.

```bash
export FLUTE_CLIENT_ID="…"
export FLUTE_CLIENT_SECRET="…"
export FLUTE_WEBHOOK_SECRET="whsec_…"

# 1. Quick-start: authenticate, fetch settings, run authorize→capture
npx tsx examples/01-quickstart.ts

# 2. Paginate the merchant's transactions
FLUTE_TX_PAGE_SIZE=25 FLUTE_TX_MAX_PAGES=4 \
  npx tsx examples/02-list-transactions.ts

# 3. Bootstrap a payment session for Flute Elements / Checkout
npx tsx examples/03-payment-sessions.ts

# 4. Walk through every error subclass in one go
npx tsx examples/04-error-handling.ts

# 5. Verify a webhook signature (replace the placeholder with a real
#    delivery captured from the sandbox)
npx tsx examples/05-webhook-verification.ts
```

Use Visa test card `4111 1111 1111 1111` — any future-month expiry and
any 3-digit CVV. The sandbox UAT base URLs are documented in
[Environments](#environments).

### C. Smoke-test the published bundle locally

Reproduces what an ISV gets from `npm install`:

```bash
npm run build
npm pack                           # produces flute-payments-sdk-0.0.0.tgz
mkdir /tmp/flute-smoke && cd /tmp/flute-smoke
npm init -y
npm install /path/to/flute-payments-sdk-0.0.0.tgz
node -e "console.log(require('@flute-payments/sdk').getVersion())"
```

If you want to use it as a Git dependency (pre-release or fork):

```bash
npm install github:aurora-payments/flute-sdk-typescript#main
```

### What "passing" means

A green run is:

1. `npm run verify` exits 0 (lint + typecheck + tests + build).
2. Coverage thresholds met — see CI output for `./coverage/index.html`.
3. CI matrix green on Node 20.19, 22.13, and 24.13.
4. The 5 example flows run cleanly against UAT with real credentials.

If any of those break in your fork, [open an issue](https://github.com/aurora-payments/flute-sdk-typescript/issues)
with the SDK version (`getVersion()`), Node version, and the
correlation id from the failing error.

## Public API surface

Everything below is covered by SemVer (PRD §NFR-4). Anything not listed
is internal and may change without notice.

### Classes

- `Flute` — top-level client (PRD §FR-1)
- `Sessions`, `MemoryTokenStorage`, `WebhooksNamespace`

### Constants

- `Environment.Sandbox` / `Environment.Production` (PRD §5.1)

### Errors (PRD §FR-5)

| Class                      | Triggered by                                            |
| -------------------------- | ------------------------------------------------------- |
| `FluteError`               | Base class — `instanceof` for catch-all branches.       |
| `FluteConfigurationError`  | Bad `clientId` / `baseUrls` / `timeoutMs` at init.      |
| `FluteAuthenticationError` | OAuth failure or 401/403 from the API.                  |
| `FluteValidationError`     | 400 / 422 — `payload.errors` carries field-level info.  |
| `FluteApiError`            | Any other non-2xx with the rich Arise error envelope.   |
| `FluteRateLimitError`      | 429 — `retryAfterMs` from `Retry-After`.                |
| `FluteIdempotencyError`    | 409 with `errorCode: 'IDEMPOTENCY_CONFLICT'`.           |
| `FluteNetworkError`        | DNS / TCP / TLS / timeout — anything before a response. |
| `FluteWebhookError`        | Caller passed missing or non-string webhook params.     |

### Types

- `FluteConfig`, `FluteEnvironment`, `EnvironmentEndpoints`
- `FluteErrorOptions`, `FluteApiErrorPayload`
- `TokenStorage`, `StoredToken`
- `Transaction`, `TransactionStatus`, `TransactionType`,
  `ListTransactionsParams`, `ListTransactionsResponse`,
  `AuthorizeTransactionParams`, `SaleTransactionParams`,
  `CaptureTransactionParams`, `RefundTransactionParams`,
  `CalculateAmountParams`, `CalculateAmountResponse`
- `PaymentSession`, `PaymentSessionStatus`, `PaymentSessionMode`,
  `CreatePaymentSessionParams`, `CreatePaymentSessionResponse`
- `PaymentSettings`
- `VerifyWebhookSignatureInput`, `VerifyWebhookSignatureOptions`

### Utilities

- `verifyWebhookSignature(input, options?)` — function form (PRD §FR-4)
- `verifyWebhookSignature(sig, id, ts, body, secret, options?)` — positional
- `getVersion()` (PRD §FR-3.5)

## Configuration

```ts
new Flute({
  // Required (PRD §FR-6.2)
  clientId: string,
  clientSecret: string,
  environment?: 'sandbox' | 'production', // default: 'sandbox'

  // Optional (PRD §FR-6.3)
  timeoutMs?: number,                  // default: 30_000
  maxRetries?: number,                 // default: 2 (5xx + network)
  retryOn429?: boolean,                // default: false (PRD §5.3)
  tokenRefreshBufferSeconds?: number,  // default: 60

  // Overrides
  baseUrls?: { isvApi?: string; payIntApi?: string; oauth?: string },
  tokenStorage?: TokenStorage,
  logger?: { debug; info; warn; error },
  userAgentSuffix?: string,
  fetch?: typeof globalThis.fetch,     // for proxy / mTLS injection
});
```

The constructor performs **no network call** (PRD §FR-1.2). The first
HTTP request triggers the OAuth token exchange. Configuration is never
read from environment variables (PRD §FR-6.4).

### Token storage

The default `MemoryTokenStorage` is fine for single-process workloads.
For serverless or multi-instance deployments, pass a Redis-, DB-, or
KV-backed implementation so tokens survive cold starts and are shared
across replicas:

```ts
class RedisTokenStorage implements TokenStorage {
  async get(key: string) {
    /* … */
  }
  async set(key: string, value) {
    /* … */
  }
  async delete(key: string) {
    /* … */
  }
}

const flute = new Flute({
  clientId: '…',
  clientSecret: '…',
  tokenStorage: new RedisTokenStorage(),
});
```

### Mocking the HTTP layer (NFR-5)

Inject a custom `fetch` implementation to intercept every outbound call
without monkey-patching the global. This is the recommended path for
ISV-side unit tests:

```ts
const recordedCalls: Request[] = [];
const flute = new Flute({
  clientId: 'cid',
  clientSecret: 'shh',
  fetch: async (input, init) => {
    recordedCalls.push(new Request(input, init));
    return new Response(JSON.stringify({ items: [], total: 0 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  },
});
```

## Environments

| Environment  | ISV API                                            | Pay-Int API                                            | OAuth                                        |
| ------------ | -------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| `sandbox`    | `https://api.uat.arise.risewithaurora.com/isv-api` | `https://api.uat.arise.risewithaurora.com/pay-int-api` | `https://oauth.uat.arise.risewithaurora.com` |
| `production` | `https://api.arise.risewithaurora.com/isv-api`     | `https://api.arise.risewithaurora.com/pay-int-api`     | `https://oauth.arise.risewithaurora.com`     |

The token endpoint is `${oauth}/oauth2/token` (PRD §FR-2.2). HTTPS is
enforced for every base URL except `localhost` / `127.0.0.1`, which the
SDK accepts over plain HTTP for contract tests.

## Errors

Every error thrown by this SDK extends `FluteError`. Discriminate on the
subclass for actionable handling:

```ts
import { FluteApiError, FluteRateLimitError, FluteValidationError } from '@flute-payments/sdk';

try {
  await flute.transactions.sale({
    /* … */
  });
} catch (err) {
  if (err instanceof FluteValidationError) {
    // err.payload.errors holds the field-level details
  } else if (err instanceof FluteRateLimitError) {
    await sleep(err.retryAfterMs ?? 1000); // we DON'T retry 429 by default
  } else if (err instanceof FluteApiError) {
    console.error(err.payload?.errorCode, err.payload?.title, err.requestId);
  } else {
    throw err;
  }
}
```

The Arise/Flute API returns rich error envelopes with `correlationId`,
`errorCode`, `title`, `cause`, `resolution`, and `documentationUrl` —
the SDK preserves all of them on `error.payload` and surfaces
`correlationId` / `requestId` directly on the error for support tickets.

## Webhooks

The Flute Notifications Service signs every delivery with HMAC-SHA256.
Three headers travel together:

| Header                    | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| `Flute-Webhook-ID`        | Unique delivery id (also used in the signature payload). |
| `Flute-Webhook-Timestamp` | UNIX timestamp **in seconds**, as a string.              |
| `Flute-Webhook-Signature` | `v1,<base64(hmac-sha256(secret, "id.ts.body"))>`.        |

`verifyWebhookSignature` returns a boolean — `true` on a valid
signature, `false` on cryptographic mismatch or a stale timestamp. It
**throws** `FluteWebhookError` only when the call itself is malformed
(missing/blank header, parsed JSON instead of raw bytes, etc.) so the
caller can answer 400 vs 401 correctly (PRD §FR-4.3).

It enforces a 5-minute replay window by default
(`toleranceSeconds: 300`); set `Number.POSITIVE_INFINITY` only if you
intentionally re-process old events offline.

> Critical: pass the **raw request body** — re-serialising parsed JSON
> (`JSON.stringify(req.body)`) breaks the HMAC because key order and
> whitespace differ.

## Compatibility

- Node `>=20.19.0` (uses native `fetch`, `AbortController`, `crypto.subtle`)
- CI runs on Node 20.19, 22.13, and 24.13
- TypeScript `>=5.0` recommended for full type fidelity
- ESM and CommonJS dual entrypoints

## Versioning & deprecation

SemVer (PRD §NFR-4). Breaking changes only on majors. Per ARISE-2288,
deprecations are announced in `CHANGELOG.md` and kept working for at
least 12 months.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Security disclosures go through
[SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
