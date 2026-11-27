import { createHash } from 'node:crypto';
import { SetupError } from './config.mjs';

function requireValue(condition, message) {
  if (!condition) throw new SetupError(message);
}
function shortText(value, maximum = 300) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maximum;
}

export function validateOrder(input) {
  requireValue(input && typeof input === 'object', 'Provide an owner-reviewed order JSON file.');
  requireValue(/^GGS-[A-Z0-9-]{4,60}$/.test(input.orderRef || ''), 'Use an opaque GGS order reference, without personal information.');
  requireValue(input.confirmed === true, 'Confirm availability, contents, fulfillment and final total before preparing an invoice.');
  requireValue(input.currency === 'usd', 'This initial sandbox integration supports USD only.');
  requireValue(Number.isInteger(input.daysUntilDue) && input.daysUntilDue >= 1 && input.daysUntilDue <= 365, 'Specify the reviewed invoice payment term in days.');
  requireValue(['pickup', 'delivery', 'shipping'].includes(input.fulfillment), 'Confirm a pickup, delivery or shipping arrangement.');
  requireValue(shortText(input.customer?.name, 200) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer?.email || ''), 'Provide the customer billing name and email.');
  requireValue(Array.isArray(input.lines) && input.lines.length > 0 && input.lines.length <= 100, 'Provide between 1 and 100 reviewed invoice lines.');
  const lines = input.lines.map(line => {
    requireValue(shortText(line.description), 'Every line needs a customer-facing description.');
    requireValue(Number.isSafeInteger(line.unitAmount) && line.unitAmount > 0, 'Unit amounts must be positive whole cents.');
    requireValue(Number.isSafeInteger(line.quantity) && line.quantity >= 1 && line.quantity <= 10000, 'Quantities must be positive whole numbers.');
    return { description: line.description.trim(), unitAmount: line.unitAmount, quantity: line.quantity, ...(line.taxCode ? { taxCode: line.taxCode } : {}) };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.unitAmount * line.quantity, 0);
  requireValue(Number.isSafeInteger(subtotal) && subtotal <= 99999999, 'The order subtotal is outside the supported range.');
  requireValue(Number.isSafeInteger(input.approvedTotal) && input.approvedTotal > 0 && input.approvedTotal <= 99999999, 'Provide the approved final total in whole cents.');
  requireValue(['none', 'automatic'].includes(input.tax?.mode), 'Confirm the Stripe Tax approach first; the example intentionally has tax unconfirmed.');
  const tax = { mode: input.tax.mode };
  let address;
  if (tax.mode === 'none') {
    requireValue(input.tax.confirmedNoCollection === true, 'Explicitly confirm that this order should have no tax collection.');
    requireValue(subtotal === input.approvedTotal, 'The approved total must match the reviewed lines when tax collection is off.');
    tax.confirmedNoCollection = true;
  } else {
    requireValue(input.tax.codesConfirmed === true, 'Confirm product tax classifications before enabling Stripe Tax.');
    requireValue(['inclusive', 'exclusive'].includes(input.tax.behavior), 'Choose whether the listed prices include tax or have tax added.');
    requireValue(lines.every(line => /^txcd_\d+$/.test(line.taxCode || '')), 'Each taxable-mode line needs its confirmed Stripe tax code.');
    // Physical goods are taxed at the owner-confirmed location of receipt:
    // pickup location for pickup; destination for delivery/shipping.
    address = input.fulfillmentAddress;
    requireValue(address?.country === 'US' && /^[A-Z]{2}$/.test(address.state || '') && /^\d{5}(-\d{4})?$/.test(address.postal_code || '') && shortText(address.line1) && shortText(address.city), 'Automatic tax requires the complete confirmed US pickup or delivery destination address.');
    address = { country: 'US', state: address.state, postal_code: address.postal_code, line1: address.line1, city: address.city, ...(address.line2 ? { line2: address.line2 } : {}) };
    tax.codesConfirmed = true;
    tax.behavior = input.tax.behavior;
  }
  return {
    orderRef: input.orderRef, confirmed: true, currency: 'usd', daysUntilDue: input.daysUntilDue,
    approvedTotal: input.approvedTotal, fulfillment: input.fulfillment,
    customer: { name: input.customer.name.trim(), email: input.customer.email.trim(), ...(address ? { shipping: { name: input.customer.name.trim(), address } } : {}) },
    lines, tax,
  };
}

export function fingerprint(order) {
  return createHash('sha256').update(JSON.stringify(order)).digest('hex');
}
