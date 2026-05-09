import type { ResourceConfig } from './_resourceConfig.js';

/**
 * Settings resource — surface defined by ARISE-1845 Phase 1.
 *
 * @public
 */
export class SettingsResource {
  readonly #config: ResourceConfig;

  /** @internal */
  public constructor(config: ResourceConfig) {
    this.#config = config;
    void this.#config;
  }

  /**
   * Retrieve the merchant's payment configuration: accepted card brands,
   * supported currencies, surcharge/cash-discount rules, and other
   * processing rails.
   *
   * Spec endpoint: `GET /v2/settings/payment-config`.
   */
  public getPaymentSettings(): Promise<never> {
    return notImplemented('settings.getPaymentSettings');
  }
}

function notImplemented(method: string): Promise<never> {
  return Promise.reject(
    new Error(
      `${method}() is not implemented yet. The Flute SDK is currently in Phase 0 (scaffolding). Track progress in ARISE-1845.`,
    ),
  );
}
