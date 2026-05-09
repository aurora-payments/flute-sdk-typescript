import type { TokenStorage } from '../auth/storage.js';
import type { EnvironmentEndpoints } from '../environment.js';
import type { FluteEnvironment } from '../client.js';

/**
 * Subset of the resolved client config that resources need.
 * Kept narrow to make resources easy to test in isolation.
 *
 * @internal
 */
export interface ResourceConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly environment: FluteEnvironment;
  readonly baseUrls: EnvironmentEndpoints;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly tokenStorage: TokenStorage;
  readonly logger: Pick<Console, 'debug' | 'info' | 'warn' | 'error'> | undefined;
  readonly userAgentSuffix: string | undefined;
}
