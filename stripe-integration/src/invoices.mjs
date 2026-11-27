import { SetupError, verifyAccount } from './config.mjs';
import { fingerprint, validateOrder } from './order.mjs';

function sandboxObject(object) {
  if (object.livemode !== false) throw new SetupError('A Stripe object was not returned in sandbox mode.');
  return object;
}

export async function verifyTax(stripe, order) {
  if (order.tax.mode === 'none') return;
  const settings = await stripe.tax.settings.retrieve();
  if (settings.status !== 'active') throw new SetupError('Stripe Tax is missing its business setup. Complete sandbox Tax Settings first.');
  let registered = false;
  for await (const registration of stripe.tax.registrations.list({ status: 'active', limit: 100 })) {
    const us = registration.country_options?.us;
    if (registration.country === 'US' && us?.state === order.customer.shipping.address.state && us.type === 'state_sales_tax') registered = true;
  }
  if (!registered) throw new SetupError('No active state sales tax registration matches this customer. Stripe Tax would not collect tax there.');
  const calculation = sandboxObject(await stripe.tax.calculations.create({
    currency: order.currency,
    customer_details: { address: order.customer.shipping.address, address_source: 'shipping' },
    line_items: order.lines.map((line, index) => ({
      amount: line.unitAmount * line.quantity, quantity: line.quantity,
      reference: `line-${index}`, tax_code: line.taxCode, tax_behavior: order.tax.behavior,
    })),
  }));
  const reasons = calculation.tax_breakdown?.map(line => line.taxability_reason);
  if (!reasons?.length || reasons.some(reason => !reason || reason === 'not_collecting')) {
    throw new SetupError('Stripe Tax did not verify collection for this order. Review registrations and the confirmed tax codes.');
  }
  if (calculation.amount_total !== order.approvedTotal) throw new SetupError('The tax-inclusive final amount differs from the approved quote. Review the quote before creating an invoice.');
  return { id: calculation.id, reasons };
}

export async function createDraft(stripe, ledger, input, now = () => Date.now()) {
  const order = validateOrder(input);
  await verifyAccount(stripe);
  return ledger.locked(order.orderRef, async () => {
    const hash = fingerprint(order);
    let record = ledger.get(order.orderRef);
    if (record && record.fingerprint !== hash) throw new SetupError('This order reference already has a different quote. Review the existing draft before making a revision.');
    if (record?.complete) {
      const existing = sandboxObject(await stripe.invoices.retrieve(record.steps.invoice));
      if (existing.total !== record.expectedTotal || existing.currency !== record.currency) {
        record.state = 'needs_review';
        ledger.save(record);
        throw new SetupError('The existing Stripe invoice differs from the approved quote. Review it in the sandbox Dashboard.');
      }
      return existing;
    }
    record ||= { orderRef: order.orderRef, fingerprint: hash, expectedTotal: order.approvedTotal, currency: order.currency, state: 'preparing', steps: {} };
    ledger.save(record);
    await verifyTax(stripe, order);

    async function step(name, execute) {
      if (record.steps[name]) return record.steps[name];
      if (record.pending && (record.pending.name !== name || now() - record.pending.started > 23 * 60 * 60 * 1000)) {
        throw new SetupError('An interrupted Stripe request needs manual reconciliation before retrying; the idempotency window may have expired.');
      }
      record.pending ||= { name, started: now() };
      ledger.save(record);
      const object = sandboxObject(await execute({ idempotencyKey: `ggs:${order.orderRef}:${hash.slice(0, 20)}:${name}` }));
      record.steps[name] = object.id;
      record.pending = null;
      ledger.save(record);
      return object.id;
    }
    const customer = await step('customer', options => stripe.customers.create({ ...order.customer }, options));
    const invoice = await step('invoice', options => stripe.invoices.create({
      customer, currency: order.currency, collection_method: 'send_invoice',
      days_until_due: order.daysUntilDue, auto_advance: false,
      pending_invoice_items_behavior: 'exclude', automatic_tax: { enabled: order.tax.mode === 'automatic' },
      metadata: { order_ref: order.orderRef },
      custom_fields: [{ name: 'Order reference', value: order.orderRef }],
      description: 'SANDBOX TEST ONLY - Glue Guns & Gossip craft order',
      footer: 'SANDBOX TEST ONLY. No real payment or fulfillment.',
    }, options));
    const current = sandboxObject(await stripe.invoices.retrieve(invoice));
    if (current.status !== 'draft') throw new SetupError('The invoice was finalized outside this process. Review it before adding or changing items.');
    for (const [index, line] of order.lines.entries()) {
      await step(`item-${index}`, options => stripe.invoiceItems.create({
        customer, invoice, currency: order.currency,
        description: line.description, unit_amount_decimal: String(line.unitAmount),
        quantity: line.quantity, discountable: false,
        ...(order.tax.mode === 'automatic' ? { tax_code: line.taxCode, tax_behavior: order.tax.behavior } : {}),
      }, options));
    }
    const result = sandboxObject(await stripe.invoices.retrieve(invoice));
    if (result.total !== order.approvedTotal || result.currency !== order.currency) {
      record.state = 'needs_review';
      ledger.save(record);
      throw new SetupError('The Stripe invoice total differs from the approved quote. Review it in the sandbox Dashboard.');
    }
    record.complete = true;
    record.state = 'draft';
    ledger.save(record);
    return result;
  });
}
