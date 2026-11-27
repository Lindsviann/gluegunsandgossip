import Stripe from 'stripe';
import { resolve } from 'node:path';

export const SANDBOX_ACCOUNT = 'acct_1UgAB3BkWqjHeQ9T';

export class SetupError extends Error {}

export function configuration(env = process.env, webhook = false) {
  const key = env.STRIPE_API_KEY || '';
  if (!/^(rk|sk)_test_[A-Za-z0-9]+$/.test(key)) {
    throw new SetupError('Configure a sandbox API key securely. Live keys are rejected.');
  }
  if (webhook && !/^whsec_\S+$/.test(env.STRIPE_WEBHOOK_SECRET || '')) {
    throw new SetupError('Configure the signing secret for this sandbox webhook endpoint.');
  }
  const port = Number(env.PORT || 8787);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new SetupError('PORT must be a valid port number.');
  }
  return {
    stripe: new Stripe(key, { apiVersion: '2026-11-18.endive', maxNetworkRetries: 2 }),
    webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    dataDirectory: resolve(env.DATA_DIRECTORY || './data'),
    host: env.HOST || '127.0.0.1',
    port,
  };
}

export async function verifyAccount(stripe) {
  const account = await stripe.accounts.retrieve();
  if (account.id !== SANDBOX_ACCOUNT) {
    throw new SetupError('The API key does not belong to the selected Glue guns and Gossip sandbox.');
  }
}

export function reportError(error) {
  console.error(error instanceof SetupError ? error.message : 'Operation failed. Check Stripe Workbench and the local order ledger; no credentials or customer data are logged.');
  process.exitCode = 1;
}
