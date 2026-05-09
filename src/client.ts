import { FluteConfigurationError } from './errors.js';
import type { TokenStorage } from './auth/storage.js';
import { MemoryTokenStorage } from './auth/storage.js';
import { TokenManager } from './auth/tokenManager.js';
import { Sessions } from './auth/sessions.js';
import { HttpClient } from './internal/http.js';
import { TransactionsResource } from './resources/transactions.js';
import { PaymentSessionsResource } from './resources/paymentSessions.js';
import { SettingsResource } from './resources/settings.js';
import { WebhooksNamespace } from './webhooks/namespace.js';
import { resolveEnvironment, type EnvironmentEndpoints } from './environment.js';

/**
 * Available Flute environments.
 *
 * @public
 */
export type FluteEnvironment = 'sandbox' | 'production';

/**
 * Configuration accepted by the {@link Flute} constructor.
 *
 * @public
 */
export interface FluteConfig {
  /**
   * OAuth 2.0 Client ID issued by Flute.
   * Treated as a secret-tier credential; never log it.
   */
  readonly clientId: string;

  /**
   * OAuth 2.0 Client Secret issued by Flute.
   * MUST stay server-side. Never bundle it into client/browser code.
   */
  readonly clientSecret: string;

  /**
   * Target environment. Defaults to `sandbox` when omitted to make
   * accidents during onboarding less expensive.
   */
  readonly environment?: FluteEnvironment;

  /**
   * Override base URLs entirely. Intended for self-hosted preview rings,
   * staging mirrors, or contract testing. Most ISVs should not set this.
   */
  readonly baseUrls?: Partial<EnvironmentEndpoints>;

  /**
   * Per-request timeout in milliseconds. Default: 30_000 ms.
   */
  readonly timeoutMs?: number;

  /**
   * Number of retries for retriable failures (5xx, 429, network errors).
   * Default: 2 (so up to 3 attempts total).
   */
  readonly maxRetries?: number;

  /**
   * Pluggable token storage. Defaults to an in-memory store, which is fine
   * for single-process workloads but gets re-created per-cold-start in
   * serverless. Pass a Redis/DB-backed implementation for multi-instance use.
   */
  readonly tokenStorage?: TokenStorage;

  /**
   * Optional logger. Anything matching the shape of {@link Console} works.
   * Sensitive fields (secrets, tokens, PAN, CVV) are redacted before logging.
   */
  readonly logger?: Pick<Console, 'debug' | 'info' | 'warn' | 'error'>;

  /**
   * Custom user-agent suffix appended after the default `flute-sdk-typescript/<version>`.
   * Useful for identifying integrations in support tickets.
   */
  readonly userAgentSuffix?: string;

  /**
   * Override the global `fetch` implementation. Reserved for tests and
   * for environments that must route every HTTP call through a
   * specific agent (mTLS, proxy, etc.).
   */
  readonly fetch?: typeof globalThis.fetch;
}

/**
 * Top-level entrypoint of the Flute SDK.
 *
 * @example
 * ```ts
 * import { Flute } from '@flute-payments/sdk';
 *
 * const flute = new Flute({
 *   clientId: process.env.FLUTE_CLIENT_ID!,
 *   clientSecret: process.env.FLUTE_CLIENT_SECRET!,
 *   environment: 'sandbox',
 * });
 *
 * const tx = await flute.transactions.sale({
 *   amount: 1099,
 *   currency: 'USD',
 *   paymentMethodToken: 'pm_…',
 * });
 * ```
 *
 * @public
 */
export class Flute {
  /** Auth surface: explicit `init`/`authenticate`/token retrieval. */
  public readonly sessions: Sessions;

  /** Transactions API: list / retrieve / authorize / sale / void / capture / refund / calculateAmount. */
  public readonly transactions: TransactionsResource;

  /** Payment Sessions API: create / retrieve / cancel. */
  public readonly paymentSessions: PaymentSessionsResource;

  /** Settings API: retrieve merchant payment configuration. */
  public readonly settings: SettingsResource;

  /** Webhook utilities: signature verification. Stateless. */
  public readonly webhooks: WebhooksNamespace;

  readonly #environment: FluteEnvironment;
  readonly #baseUrls: EnvironmentEndpoints;

  public constructor(config: FluteConfig) {
    if (typeof config.clientId !== 'string' || config.clientId.length === 0) {
      throw new FluteConfigurationError('`clientId` is required and must be a non-empty string.');
    }
    if (typeof config.clientSecret !== 'string' || config.clientSecret.length === 0) {
      throw new FluteConfigurationError(
        '`clientSecret` is required and must be a non-empty string.',
      );
    }

    const environment: FluteEnvironment = config.environment ?? 'sandbox';
    const baseUrls = resolveEnvironment(environment, config.baseUrls);
    const tokenStorage = config.tokenStorage ?? new MemoryTokenStorage();

    const httpClient = new HttpClient({
      timeoutMs: config.timeoutMs ?? 30_000,
      maxRetries: config.maxRetries ?? 2,
      userAgentSuffix: config.userAgentSuffix,
      logger: config.logger,
      ...(config.fetch !== undefined ? { fetchImpl: config.fetch } : {}),
    });

    const tokenManager = new TokenManager({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      oauthBaseUrl: baseUrls.oauth,
      storage: tokenStorage,
      http: httpClient,
    });

    httpClient.setAuth(tokenManager);

    const resourceConfig = { baseUrls, http: httpClient };

    this.#environment = environment;
    this.#baseUrls = baseUrls;
    this.sessions = new Sessions(tokenManager);
    this.transactions = new TransactionsResource(resourceConfig);
    this.paymentSessions = new PaymentSessionsResource(resourceConfig);
    this.settings = new SettingsResource(resourceConfig);
    this.webhooks = new WebhooksNamespace();
  }

  /** Currently configured environment. Read-only. */
  public get environment(): FluteEnvironment {
    return this.#environment;
  }

  /** Resolved base URLs in use. Read-only. Useful for diagnostics and tests. */
  public get baseUrls(): EnvironmentEndpoints {
    return this.#baseUrls;
  }
}
