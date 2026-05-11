# `@flute-payments/sdk`

> **Status:** Phase 1 complete. Every method on the public surface is
> wired and tested against the live API contracts. Track delivery in
> [ARISE-1845](https://rwaapps.atlassian.net/browse/ARISE-1845).

Official server-side TypeScript / Node.js SDK for the Flute payment
platform. This package is the **reference implementation** for all
future Flute SDKs (Phase 2: PHP). Naming conventions, error model, and
documentation patterns established here become the contract every other
language SDK follows.

## What's in scope (Phase 1)

19 methods across 5 modules, plus webhook signature verification:

| Module           | Methods                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------- |
| Session          | `init`, `authenticate`, `getAccessToken`, `refreshAccessToken`, `clearStoredToken`      |
| Transactions     | `list`, `retrieve`, `authorize`, `sale`, `void`, `capture`, `refund`, `calculateAmount` |
| Payment Sessions | `create`, `retrieve`, `cancel`                                                          |
| Settings         | `getPaymentSettings`                                                                    |
| General          | `getVersion`                                                                            |
| Webhooks         | `verifySignature`                                                                       |

**Out of scope for Phase 1:** ACH transactions, customers, subscriptions,
invoices, quick payments, POS, devices, webhook management. They will
follow in later releases (see ARISE-1845 for the roadmap).

## Install

```bash
npm install @flute-payments/sdk
```

> Requires Node `>=20.19.0`.

## Quick start

```ts
import { Flute } from '@flute-payments/sdk';

const flute = new Flute({
  clientId: process.env.FLUTE_CLIENT_ID!,
  clientSecret: process.env.FLUTE_CLIENT_SECRET!,
  environment: 'sandbox', // or 'production'
});

// 1) (optional) Surface bad credentials at boot, not on first sale.
await flute.sessions.authenticate();

// 2) Run a sale (auto-capture).
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

// 3) Verify an incoming webhook (Express-style).
const ok = flute.webhooks.verifySignature({
  signatureHeader: req.headers['flute-webhook-signature'] as string,
  idHeader: req.headers['flute-webhook-id'] as string,
  timestampHeader: req.headers['flute-webhook-timestamp'] as string,
  rawRequestBody: rawBuffer, // raw bytes, NOT parsed JSON
  signatureSecret: process.env.FLUTE_WEBHOOK_SECRET!,
});
```

See the runnable [examples/](./examples) for the full
authorize → capture → refund flow and a complete webhook handler.

## Public API surface

Everything below is covered by SemVer. Anything not listed is internal
and may change without notice.

### Classes

- `Flute`
- `MemoryTokenStorage`
- `Sessions`

### Errors

- `FluteError` (base)
- `FluteAuthenticationError`
- `FluteApiError`
- `FluteValidationError`
- `FluteRateLimitError`
- `FluteIdempotencyError`
- `FluteNetworkError`
- `FluteConfigurationError`

### Types

- `FluteConfig`, `FluteEnvironment`, `EnvironmentEndpoints`
- `FluteErrorOptions`, `FluteApiErrorPayload`
- `TokenStorage`, `StoredToken`
- `Transaction`, `TransactionStatus`, `TransactionType`,
  `ListTransactionsParams`, `ListTransactionsResponse`,
  `AuthorizeTransactionParams`, `SaleTransactionParams`,
  `CaptureTransactionParams`, `RefundTransactionParams`,
  `CalculateAmountParams`, `CalculateAmountResponse`
- `PaymentSession`, `PaymentSessionStatus`, `CreatePaymentSessionParams`
- `PaymentSettings`
- `VerifyWebhookSignatureInput`, `VerifyWebhookSignatureOptions`

### Utilities

- `verifyWebhookSignature`
- `getVersion`

## Configuration

```ts
new Flute({
  clientId: string,
  clientSecret: string,
  environment?: 'sandbox' | 'production', // default: 'sandbox'
  baseUrls?: {
    isvApi?: string;
    payIntApi?: string;
    oauth?: string;
  },
  timeoutMs?: number,        // default: 30_000
  maxRetries?: number,       // default: 2
  tokenStorage?: TokenStorage, // default: MemoryTokenStorage
  logger?: Console,           // default: undefined (no logging)
  userAgentSuffix?: string,
});
```

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

## Environments

| Environment  | ISV API                                            | Pay-Int API     | OAuth        |
| ------------ | -------------------------------------------------- | --------------- | ------------ |
| `sandbox`    | `https://api.uat.arise.risewithaurora.com/isv-api` | `…/pay-int-api` | `…/identity` |
| `production` | `https://api.arise.risewithaurora.com/isv-api`     | `…/pay-int-api` | `…/identity` |

Override any of these via `baseUrls` when targeting a preview ring or
self-hosted mirror.

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
    await sleep(err.retryAfterMs ?? 1000);
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

`verifyWebhookSignature` returns a boolean and never throws on adversarial
input. It enforces a 5-minute replay window by default
(`toleranceSeconds: 300`); set `Number.POSITIVE_INFINITY` only if you
intentionally re-process old events offline.

Critical: pass the **raw request body** — re-serialising parsed JSON
(`JSON.stringify(req.body)`) breaks the HMAC because key order and
whitespace differ.

## Compatibility

- Node `>=20.19.0` (uses native `fetch`, `AbortController`, `crypto.subtle`)
- CI runs on Node 20.19, 22.13, and 24.13
- TypeScript `>=5.0` recommended for full type fidelity
- ESM and CommonJS dual entrypoints

## Versioning & deprecation

SemVer. Breaking changes only on majors. Per ARISE-2288, deprecations are
announced in `CHANGELOG.md` and kept working for at least 12 months.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Security disclosures go through
[SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE)
