import type { ResourceConfig } from './_resourceConfig.js';

/**
 * Payment Sessions resource — surface defined by ARISE-1845 Phase 1.
 *
 * Note: Payment Sessions still live under the legacy `pay-int-api/v1`
 * routes at the time this SDK ships, while transactions and settings
 * already use `isv-api/v2`. The {@link Flute} client routes per resource
 * via the `baseUrls` configuration.
 *
 * @public
 */
export class PaymentSessionsResource {
  readonly #config: ResourceConfig;

  /** @internal */
  public constructor(config: ResourceConfig) {
    this.#config = config;
    void this.#config;
  }

  /**
   * Create a new payment session — the recommended flow for any UI that
   * collects card details on the frontend (Elements, Checkout, hosted
   * page, etc.). Protects against duplicate charges and centralises tip,
   * surcharge, discount and authorization rules.
   *
   * Spec endpoint: `POST /pay-int-api/payment-sessions`.
   */
  public create(): Promise<never> {
    return notImplemented('paymentSessions.create');
  }

  /**
   * Retrieve a payment session by id (e.g. to render its current state on
   * a callback page).
   *
   * Spec endpoint: `GET /pay-int-api/payment-sessions/{paymentSessionId}`.
   */
  public retrieve(_id: string): Promise<never> {
    return notImplemented('paymentSessions.retrieve');
  }

  /**
   * Cancel an open payment session. No-op if it was already finalised.
   *
   * Spec endpoint: `POST /pay-int-api/payment-sessions/{paymentSessionId}/cancel`.
   */
  public cancel(_id: string): Promise<never> {
    return notImplemented('paymentSessions.cancel');
  }
}

function notImplemented(method: string): Promise<never> {
  return Promise.reject(
    new Error(
      `${method}() is not implemented yet. The Flute SDK is currently in Phase 0 (scaffolding). Track progress in ARISE-1845.`,
    ),
  );
}
