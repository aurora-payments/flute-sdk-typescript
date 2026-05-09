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

const SANDBOX_DEFAULTS: EnvironmentEndpoints = {
  isvApi: 'https://api.uat.arise.risewithaurora.com/isv-api',
  payIntApi: 'https://api.uat.arise.risewithaurora.com/pay-int-api',
  oauth: 'https://api.uat.arise.risewithaurora.com/identity',
};

const PRODUCTION_DEFAULTS: EnvironmentEndpoints = {
  isvApi: 'https://api.arise.risewithaurora.com/isv-api',
  payIntApi: 'https://api.arise.risewithaurora.com/pay-int-api',
  oauth: 'https://api.arise.risewithaurora.com/identity',
};

/**
 * Path appended to the OAuth base URL to reach the token endpoint.
 * Locked by the Identity Service config (`SetTokenEndpointUris("/oauth2/token")`).
 *
 * @internal
 */
export const TOKEN_ENDPOINT_PATH = '/oauth2/token' as const;

/**
 * Merge per-environment defaults with user overrides. Trailing slashes
 * are normalised away so callers can append `/v2/transactions` cleanly.
 *
 * @internal
 */
export function resolveEnvironment(
  environment: FluteEnvironment,
  overrides: Partial<EnvironmentEndpoints> | undefined,
): EnvironmentEndpoints {
  const defaults = environment === 'production' ? PRODUCTION_DEFAULTS : SANDBOX_DEFAULTS;
  return {
    isvApi: stripTrailingSlash(overrides?.isvApi ?? defaults.isvApi),
    payIntApi: stripTrailingSlash(overrides?.payIntApi ?? defaults.payIntApi),
    oauth: stripTrailingSlash(overrides?.oauth ?? defaults.oauth),
  };
}

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}
