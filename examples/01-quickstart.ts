/**
 * Quickstart — TODO: replace with the real flow once Phase 1 ships.
 *
 * The goal of this example is to demonstrate the "<30 minutes from
 * credentials to first sale" promise documented in the PRD section 4.
 *
 * Run with: `npx tsx examples/01-quickstart.ts`
 */

import { Flute } from '../src/index.js';

async function main(): Promise<void> {
  const clientId = process.env['FLUTE_CLIENT_ID'];
  const clientSecret = process.env['FLUTE_CLIENT_SECRET'];

  if (!clientId || !clientSecret) {
    console.error(
      'Missing FLUTE_CLIENT_ID or FLUTE_CLIENT_SECRET. Get sandbox credentials from your Flute dashboard.',
    );
    process.exit(1);
  }

  const flute = new Flute({
    clientId,
    clientSecret,
    environment: 'sandbox',
  });

  console.log('Flute SDK initialised in', flute.environment, 'environment.');
  console.log('Phase 1 will wire up the real sale call here.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
