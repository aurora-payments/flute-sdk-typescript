import type { ResourceConfig } from './_resourceConfig.js';

/**
 * Transactions resource — surface defined by ARISE-1845 Phase 1.
 *
 * Methods are exposed as nested calls (`flute.transactions.sale(...)`) per
 * ARISE-2288 conventions. Implementations land in Phase 1 and 2 of the
 * delivery plan; Phase 0 only locks the public shape.
 *
 * @public
 */
export class TransactionsResource {
  // Held for Phase 1+ wiring. The `// @ts-expect-error` markers around
  // unused-config will go away as soon as we wire the HTTP client.
  readonly #config: ResourceConfig;

  /** @internal */
  public constructor(config: ResourceConfig) {
    this.#config = config;
    void this.#config;
  }

  /**
   * List transactions for the authenticated merchant. Supports
   * pagination, date filters, and status filters once implemented.
   *
   * Spec endpoint: `GET /v2/transactions`.
   */
  public list(): Promise<never> {
    return notImplemented('transactions.list');
  }

  /**
   * Retrieve a single transaction by id.
   *
   * Spec endpoint: `GET /v2/transactions/{id}`.
   */
  public retrieve(_id: string): Promise<never> {
    return notImplemented('transactions.retrieve');
  }

  /**
   * Authorize an amount without capturing it (a.k.a. hold).
   *
   * Spec endpoint: `POST /v2/transactions/hold`.
   */
  public authorize(): Promise<never> {
    return notImplemented('transactions.authorize');
  }

  /**
   * Authorize and immediately capture an amount (one-shot sale).
   *
   * Spec endpoint: `POST /v2/transactions` (with sale flag).
   */
  public sale(): Promise<never> {
    return notImplemented('transactions.sale');
  }

  /**
   * Reverse a not-yet-settled transaction. Behaves like void in the
   * card-present world.
   *
   * Spec endpoint: `POST /v2/transactions/{transactionId}/reversal`.
   */
  public void(_id: string): Promise<never> {
    return notImplemented('transactions.void');
  }

  /**
   * Capture a previously authorized transaction.
   *
   * Spec endpoint: `POST /v2/transactions/{transactionId}/capture`.
   */
  public capture(_id: string): Promise<never> {
    return notImplemented('transactions.capture');
  }

  /**
   * Refund a settled transaction (full or partial).
   *
   * Spec endpoint: `POST /v2/transactions/credit`.
   */
  public refund(): Promise<never> {
    return notImplemented('transactions.refund');
  }

  /**
   * Compute the amount breakdown (taxes, surcharges, tips) without
   * persisting a transaction.
   *
   * Spec endpoint: `POST /v2/transactions/calculate-amount`.
   */
  public calculateAmount(): Promise<never> {
    return notImplemented('transactions.calculateAmount');
  }
}

function notImplemented(method: string): Promise<never> {
  return Promise.reject(
    new Error(
      `${method}() is not implemented yet. The Flute SDK is currently in Phase 0 (scaffolding). Track progress in ARISE-1845.`,
    ),
  );
}
