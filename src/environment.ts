import { FluteConfigurationError } from './errors.js';
import type { FluteEnvironment } from './client.js';

/**
 * Resolved set of base URLs the SDK talks to.
 *
 * Phase 1 surface targets three prefixes:
 *
 * - `isvApi` — the ISV BFF v2 (transactions, settings).
 * - `payIntApi` — the Payment Integrations API (payment sessions),
 *   which still lives under v1 paths at the time this SDK ships.
 * - `oauth` — the Identity Service base URL. The token endpoint is
 *   `${oauth}/oauth2/token` (OpenIddict, configured server-side via
 *   `options.SetTokenEndpointUris("/oauth2/token")`).
 *
 * @internal
 */
export interface EnvironmentEndpoints {
  /** Base URL for the ISV API BFF (v2). */
  readonly isvApi: string;
  /** Base URL for the Payment Integrations API (v1) — payment sessions live here. */
  readonly payIntApi: string;
  /** Base URL for the Identity Service. The token endpoint is `${oauth}/oauth2/token`. */
  readonly oauth: string;
}

// Verified live against UAT (2026-05-14): the ISV BFF endpoints are
// served under the API host root with the `/v2/...` paths declared in
// `openapi/isv-api-v2.json` (e.g. `/v2/transactions`,
// `/v2/settings/payment-config`). The `/isv-api/` segment that appears
// in URLs like
// `api.uat.arise.risewithaurora.com/isv-api/swagger/v2/swagger.json`
// is the path of the **Swagger UI**, not a prefix of the API itself.
// Earlier defaults (0.1.0 → 0.1.2) included `/isv-api` here; that was
// a misread of the Swagger UI URL and produced `404 Not Found` on
// every call to `transactions.*` and `settings.*` against the live
// host. The Payment Integrations API is the opposite case: it really
// is mounted under `/pay-int-api/`, and the OAuth host is a dedicated
// `oauth.*` subdomain (PRD §FR-2.2; token endpoint is /oauth2/token).
const SANDBOX_DEFAULTS: EnvironmentEndpoints = {
  isvApi: 'https://api.uat.arise.risewithaurora.com',
  payIntApi: 'https://api.uat.arise.risewithaurora.com/pay-int-api',
  oauth: 'https://oauth.uat.arise.risewithaurora.com',
};

const PRODUCTION_DEFAULTS: EnvironmentEndpoints = {
  isvApi: 'https://api.arise.risewithaurora.com',
  payIntApi: 'https://api.arise.risewithaurora.com/pay-int-api',
  oauth: 'https://oauth.arise.risewithaurora.com',
};

/**
 * Path appended to the OAuth base URL to reach the token endpoint.
 * Locked by the Identity Service config (`SetTokenEndpointUris("/oauth2/token")`).
 *
 * @internal
 */
export const TOKEN_ENDPOINT_PATH = '/oauth2/token' as const;

/**
 * Merge per-environment defaults with user overrides, validate the
 * resulting URLs, and strip trailing slashes so callers can append
 * `/v2/transactions` cleanly.
 *
 * Per PRD §NFR-1, every base URL MUST be HTTPS — except `localhost` /
 * `127.0.0.1`, which we permit so contract tests, mock servers, and
 * local proxies can use plain HTTP without ceremony.
 *
 * @internal
 */
export function resolveEnvironment(
  environment: FluteEnvironment,
  overrides: Partial<EnvironmentEndpoints> | undefined,
): EnvironmentEndpoints {
  const defaults = environment === 'production' ? PRODUCTION_DEFAULTS : SANDBOX_DEFAULTS;
  const resolved = {
    isvApi: stripTrailingSlash(overrides?.isvApi ?? defaults.isvApi),
    payIntApi: stripTrailingSlash(overrides?.payIntApi ?? defaults.payIntApi),
    oauth: stripTrailingSlash(overrides?.oauth ?? defaults.oauth),
  };
  enforceHttps('isvApi', resolved.isvApi);
  enforceHttps('payIntApi', resolved.payIntApi);
  enforceHttps('oauth', resolved.oauth);
  return resolved;
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function enforceHttps(field: keyof EnvironmentEndpoints, value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new FluteConfigurationError(
      `\`baseUrls.${field}\` is not a valid URL: ${JSON.stringify(value)}.`,
    );
  }
  if (parsed.protocol === 'https:') return;
  if (parsed.protocol === 'http:' && isLoopbackHost(parsed.hostname)) return;
  throw new FluteConfigurationError(
    `\`baseUrls.${field}\` must use HTTPS (got ${parsed.protocol}//${parsed.hostname}). HTTP is only allowed on localhost / 127.0.0.1 for tests.`,
  );
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}
