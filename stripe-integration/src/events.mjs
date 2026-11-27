import { SetupError } from './config.mjs';

export const WEBHOOK_EVENTS = [
  'invoice.finalized', 'invoice.paid', 'invoice.payment_failed', 'invoice.voided', 'invoice.marked_uncollectible',
  'credit_note.created', 'credit_note.updated', 'credit_note.voided', 'charge.refunded', 'charge.dispute.created',
];
const idOf = value => typeof value === 'string' ? value : value?.id;

export async function processEvent(stripe, ledger, event) {
  if (event.livemode !== false || event.account) throw new SetupError('Only direct-account sandbox events are accepted.');
  if (!WEBHOOK_EVENTS.includes(event.type)) return { ignored: true };
  if (ledger.hasEvent(event.id)) return { duplicate: true };
  const object = event.data.object;
  const risk = event.type.startsWith('credit_note.') || event.type === 'charge.refunded' || event.type === 'charge.dispute.created';
  let ids;
  if (event.type.startsWith('invoice.')) ids = [object.id];
  else if (event.type.startsWith('credit_note.')) ids = [idOf(object.invoice)];
  else {
    const charge = event.type === 'charge.refunded' ? object : await stripe.charges.retrieve(idOf(object.charge));
    const intent = idOf(charge.payment_intent);
    ids = [];
    if (intent) {
      for await (const payment of stripe.invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: intent }, limit: 100 })) {
        ids.push(idOf(payment.invoice));
      }
    }
  }
  const changes = [];
  for (const id of new Set(ids.filter(Boolean))) {
    const order = ledger.byInvoice(id);
    if (!order) continue;
    // Retrieve current state, since Stripe doesn't guarantee webhook delivery order.
    const invoice = await stripe.invoices.retrieve(id);
    if (invoice.livemode !== false) throw new SetupError('The invoice was not returned in sandbox mode.');
    let state = invoice.status === 'open' ? 'awaiting_payment' : invoice.status;
    if (risk || !order.complete || !['draft', 'open', 'paid', 'void', 'uncollectible'].includes(invoice.status) || invoice.total !== order.expectedTotal || invoice.currency !== order.currency) state = 'needs_review';
    else if (invoice.status === 'paid' && invoice.amount_remaining !== 0) state = 'needs_review';
    changes.push({ orderRef: order.orderRef, state });
  }
  ledger.applyEvent(event.id, changes);
  return { recorded: true };
}
