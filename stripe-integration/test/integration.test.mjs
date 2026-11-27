import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Stripe from 'stripe';
import { SANDBOX_ACCOUNT, configuration } from '../src/config.mjs';
import { Ledger } from '../src/store.mjs';
import { createDraft } from '../src/invoices.mjs';
import { validateOrder } from '../src/order.mjs';
import { processEvent } from '../src/events.mjs';
import { webhookServer } from '../src/server.mjs';

const clone = value => structuredClone(value);
const example = {
  orderRef: 'GGS-TEST-0001', confirmed: true, currency: 'usd', daysUntilDue: 7,
  approvedTotal: 1200, fulfillment: 'pickup', customer: { name: 'Test fixture', email: 'fixture@example.com' },
  lines: [{ description: 'Fixture craft kit', unitAmount: 600, quantity: 2 }],
  tax: { mode: 'none', confirmedNoCollection: true },
};

function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'ggs-stripe-test-'));
  const ledger = new Ledger(directory);
  t.after(() => { ledger.close(); rmSync(directory, { recursive: true, force: true }); });
  const calls = [];
  const objects = new Map();
  const invoice = { id: 'in_fixture', livemode: false, status: 'draft', currency: 'usd', total: 0, amount_remaining: 1200 };
  let interrupt = false;
  async function write(kind, body, options) {
    const key = options.idempotencyKey;
    if (objects.has(key)) return clone(objects.get(key));
    calls.push({ kind, body: clone(body), key });
    if (kind === 'item') invoice.total += Number(body.unit_amount_decimal) * body.quantity;
    const result = kind === 'invoice' ? clone(invoice) : { id: `${kind}_fixture_${calls.length}`, livemode: false };
    objects.set(key, result);
    if (interrupt) { interrupt = false; throw new Error('Simulated timeout after Stripe accepted the request'); }
    return clone(result);
  }
  const stripe = {
    accounts: { retrieve: async () => ({ id: SANDBOX_ACCOUNT }) },
    customers: { create: (body, options) => write('customer', body, options) },
    invoices: { create: (body, options) => write('invoice', body, options), retrieve: async () => clone(invoice) },
    invoiceItems: { create: (body, options) => write('item', body, options) },
    invoicePayments: { list: async function* () { yield { invoice: 'in_fixture' }; } },
    charges: { retrieve: async () => ({ payment_intent: 'pi_fixture' }) },
    tax: {
      settings: { retrieve: async () => ({ status: 'active' }) },
      registrations: { list: async function* () { yield { country: 'US', country_options: { us: { state: 'MO', type: 'state_sales_tax' } } }; } },
      calculations: { create: async () => ({ id: 'taxcalc_fixture', livemode: false, amount_total: 1200, tax_breakdown: [{ taxability_reason: 'product_exempt' }] }) },
    },
  };
  return { stripe, ledger, invoice, calls, interruptNext: () => { interrupt = true; } };
}

function taxOrder() {
  return { ...clone(example), fulfillmentAddress: { country: 'US', state: 'MO', postal_code: '64068', city: 'Example city', line1: '1 Example Street' }, lines: example.lines.map(line => ({ ...line, taxCode: 'txcd_99999999' })), tax: { mode: 'automatic', codesConfirmed: true, behavior: 'inclusive' } };
}
function event(type, id = 'evt_fixture') {
  return { id, object: 'event', livemode: false, type, data: { object: { id: 'in_fixture' } } };
}

test('rejects live keys and missing credentials before making requests', () => {
  assert.throws(() => configuration({}), /sandbox API key/);
  assert.throws(() => configuration({ STRIPE_API_KEY: ['sk', 'live', 'fixture'].join('_') }), /Live keys/);
});

test('requires explicit tax choice, whole quantities, and a matching approved amount', () => {
  assert.throws(() => validateOrder({ ...example, tax: { mode: 'unconfirmed' } }), /Stripe Tax approach/);
  assert.throws(() => validateOrder({ ...example, approvedTotal: 1 }), /approved total/);
  assert.throws(() => validateOrder({ ...example, lines: [{ ...example.lines[0], quantity: 1.5 }] }), /whole numbers/);
});

test('creates only a sandbox draft, with reviewed amount and no pending-item leakage', async t => {
  const { stripe, ledger, calls } = setup(t);
  const result = await createDraft(stripe, ledger, example);
  assert.equal(result.status, 'draft');
  assert.equal(result.total, 1200);
  const body = calls.find(call => call.kind === 'invoice').body;
  assert.equal(body.auto_advance, false);
  assert.equal(body.collection_method, 'send_invoice');
  assert.equal(body.pending_invoice_items_behavior, 'exclude');
  assert.equal(body.automatic_tax.enabled, false);
  assert.equal(ledger.get(example.orderRef).complete, true);
});

test('same order retry reuses the existing invoice and does not duplicate items', async t => {
  const { stripe, ledger, calls } = setup(t);
  await createDraft(stripe, ledger, example);
  await createDraft(stripe, ledger, example);
  assert.equal(calls.length, 3);
});

test('detects a draft total changed in the Dashboard before reusing it', async t => {
  const { stripe, ledger, invoice } = setup(t);
  await createDraft(stripe, ledger, example);
  invoice.total = 1300;
  await assert.rejects(createDraft(stripe, ledger, example), /existing Stripe invoice differs/);
  assert.equal(ledger.get(example.orderRef).state, 'needs_review');
});

test('recovers a timed-out Stripe create using the same idempotency key', async t => {
  const { stripe, ledger, calls, interruptNext } = setup(t);
  interruptNext();
  await assert.rejects(createDraft(stripe, ledger, example), /Simulated timeout/);
  await createDraft(stripe, ledger, example);
  assert.equal(calls.filter(call => call.kind === 'customer').length, 1);
  assert.equal(calls.length, 3);
});

test('blocks an unresolved retry after Stripe idempotency may have expired', async t => {
  const { stripe, ledger, calls, interruptNext } = setup(t);
  interruptNext();
  await assert.rejects(createDraft(stripe, ledger, example, () => 0));
  await assert.rejects(createDraft(stripe, ledger, example, () => 24 * 60 * 60 * 1000), /idempotency window/);
  assert.equal(calls.length, 1);
});

test('rejects a changed quote using an already used order reference', async t => {
  const { stripe, ledger, calls } = setup(t);
  await createDraft(stripe, ledger, example);
  await assert.rejects(createDraft(stripe, ledger, { ...example, daysUntilDue: 8 }), /different quote/);
  assert.equal(calls.length, 3);
});

test('prevents concurrent creation of the same order', async t => {
  const { ledger } = setup(t);
  await ledger.locked(example.orderRef, async () => {
    await assert.rejects(ledger.locked(example.orderRef, async () => {}), /already being prepared/);
  });
});

test('a key from another account cannot create customers or invoices', async t => {
  const { stripe, ledger, calls } = setup(t);
  stripe.accounts.retrieve = async () => ({ id: 'acct_other_fixture' });
  await assert.rejects(createDraft(stripe, ledger, example), /does not belong/);
  assert.equal(calls.length, 0);
});

test('automatic tax blocks incomplete setup before invoice creation', async t => {
  const { stripe, ledger, calls } = setup(t);
  stripe.tax.settings.retrieve = async () => ({ status: 'pending' });
  await assert.rejects(createDraft(stripe, ledger, taxOrder()), /Tax Settings/);
  assert.equal(calls.length, 0);
});

test('automatic tax blocks missing registrations', async t => {
  const { stripe, ledger, calls } = setup(t);
  stripe.tax.registrations.list = async function* () {};
  await assert.rejects(createDraft(stripe, ledger, taxOrder()), /No active state/);
  assert.equal(calls.length, 0);
});

test('automatic tax rejects not_collecting and a changed quote', async t => {
  const { stripe, ledger, calls } = setup(t);
  stripe.tax.calculations.create = async () => ({ id: 'taxcalc_fixture', livemode: false, amount_total: 1200, tax_breakdown: [{ taxability_reason: 'not_collecting' }] });
  await assert.rejects(createDraft(stripe, ledger, taxOrder()), /did not verify/);
  stripe.tax.calculations.create = async () => ({ id: 'taxcalc_fixture', livemode: false, amount_total: 1300, tax_breakdown: [{ taxability_reason: 'standard_rated' }] });
  await assert.rejects(createDraft(stripe, ledger, taxOrder()), /differs from the approved/);
  assert.equal(calls.length, 0);
});

test('automatic tax accepts a verified exempt result and preserves the confirmed code', async t => {
  const { stripe, ledger, calls } = setup(t);
  await createDraft(stripe, ledger, taxOrder());
  assert.equal(calls.find(call => call.kind === 'invoice').body.automatic_tax.enabled, true);
  assert.equal(calls.find(call => call.kind === 'item').body.tax_code, 'txcd_99999999');
});

test('out-of-order failed event reads current paid invoice and deduplicates delivery', async t => {
  const { stripe, ledger, invoice } = setup(t);
  await createDraft(stripe, ledger, example);
  invoice.status = 'paid'; invoice.amount_remaining = 0;
  await processEvent(stripe, ledger, event('invoice.payment_failed'));
  assert.equal(ledger.get(example.orderRef).state, 'paid');
  assert.deepEqual(await processEvent(stripe, ledger, event('invoice.payment_failed')), { duplicate: true });
});

test('an unpaid delayed payment never sets the order to paid', async t => {
  const { stripe, ledger, invoice } = setup(t);
  await createDraft(stripe, ledger, example);
  invoice.status = 'open';
  await processEvent(stripe, ledger, event('invoice.payment_failed'));
  assert.equal(ledger.get(example.orderRef).state, 'awaiting_payment');
});

test('a mismatched invoice total puts the order on a persistent review hold', async t => {
  const { stripe, ledger, invoice } = setup(t);
  await createDraft(stripe, ledger, example);
  invoice.status = 'paid'; invoice.amount_remaining = 0; invoice.total = 100;
  await processEvent(stripe, ledger, event('invoice.paid'));
  invoice.total = 1200;
  await processEvent(stripe, ledger, event('invoice.paid', 'evt_later'));
  assert.equal(ledger.get(example.orderRef).state, 'needs_review');
});

test('refunds resolve the invoice through PaymentIntent and keep a review hold', async t => {
  const { stripe, ledger, invoice } = setup(t);
  await createDraft(stripe, ledger, example);
  invoice.status = 'paid'; invoice.amount_remaining = 0;
  const refunded = event('charge.refunded');
  refunded.data.object = { id: 'ch_fixture', payment_intent: 'pi_fixture' };
  await processEvent(stripe, ledger, refunded);
  await processEvent(stripe, ledger, event('invoice.paid', 'evt_later'));
  assert.equal(ledger.get(example.orderRef).state, 'needs_review');
});

test('disputes and credit notes hold the associated order for review', async t => {
  const { stripe, ledger } = setup(t);
  await createDraft(stripe, ledger, example);
  const disputed = event('charge.dispute.created');
  disputed.data.object = { id: 'dp_fixture', charge: 'ch_fixture' };
  await processEvent(stripe, ledger, disputed);
  const credit = event('credit_note.created', 'evt_credit');
  credit.data.object = { id: 'cn_fixture', invoice: 'in_fixture' };
  await processEvent(stripe, ledger, credit);
  assert.equal(ledger.get(example.orderRef).state, 'needs_review');
});

test('API failure leaves a webhook event retryable', async t => {
  const { stripe, ledger } = setup(t);
  await createDraft(stripe, ledger, example);
  stripe.invoices.retrieve = async () => { throw new Error('Fixture outage'); };
  await assert.rejects(processEvent(stripe, ledger, event('invoice.paid')), /Fixture outage/);
  assert.equal(ledger.hasEvent('evt_fixture'), false);
});

test('HTTP listener verifies raw signatures, rejects tampering and live events, and retries errors', async t => {
  const { stripe, ledger } = setup(t);
  const sdk = new Stripe('fixture-key');
  const secret = 'fixture-signature-secret';
  stripe.webhooks = sdk.webhooks;
  const server = webhookServer({ stripe, ledger, webhookSecret: secret });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/webhooks/stripe`;
  async function send(payload, { tamper = false, expired = false } = {}) {
    const body = JSON.stringify(payload);
    const signature = sdk.webhooks.generateTestHeaderString({ payload: body, secret, ...(expired ? { timestamp: 1 } : {}) });
    return fetch(url, { method: 'POST', headers: { 'stripe-signature': signature }, body: tamper ? `${body} ` : body });
  }
  assert.equal((await send(event('invoice.paid'))).status, 200);
  assert.equal((await send(event('invoice.paid'), { tamper: true })).status, 400);
  assert.equal((await send(event('invoice.paid'), { expired: true })).status, 400);
  assert.equal((await send({ ...event('invoice.paid'), livemode: true })).status, 400);
  assert.equal((await send({ ...event('invoice.paid'), account: 'acct_other_fixture' })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', body: '{}' })).status, 400);
  assert.equal((await fetch(url)).status, 405);
  await createDraft(stripe, ledger, example);
  stripe.invoices.retrieve = async () => { throw new Error('Fixture outage'); };
  assert.equal((await send(event('invoice.paid', 'evt_http_retry'))).status, 500);
});
