# Stripe sandbox starter for Glue Guns & Gossip

This adds Stripe to the existing **request, confirm, then pay** craft-order process. It prepares an invoice after Lindsey confirms availability, item choices, fulfillment, and the final amount. The invoice stays in draft for owner review. After it is finalized in the sandbox Dashboard, the customer can use Stripe's hosted invoice page. Payment status is recorded through a signed webhook.

**Status:** sandbox implementation, locally tested. No real Stripe invoice or payment has been created by this change. A real sandbox payment test still requires secure API-key configuration and Lindsey's tax decision. No public shop pages, posted QR destinations, Jotforms, or staff drawing flows are changed.

The [integration plan](PLAN.md) covers all eight requested Stripe products and the findings from the existing site.

## What is included

- Owner-operated draft invoice creation using the current Stripe SDK.
- A fixed account check for **Glue guns and Gossip sandbox**, plus rejection of live keys and live webhook events.
- Whole-cent amounts, whole-number quantities, confirmed quotes, and customer-initiated payment. There is no public endpoint that accepts a customer-supplied price.
- Persistent SQLite order references, invoice IDs, event deduplication, and resumable idempotent API operations.
- A required tax choice: explicit no-collection confirmation, or automatic tax with verified setup, a matching active registration, confirmed line classifications, and a sandbox tax calculation that matches the approved total.
- Raw-body webhook signature verification, current invoice retrieval for out-of-order events, and review holds for refund, dispute, credit note, mode, or total problems.
- Manual fulfillment. Neither a redirect page nor a webhook ships products, sends an email, decrements inventory, or marks a Jotform paid.

## Configure securely

Use Node.js 24 or newer, then run these commands from this directory:

```sh
npm ci
npm test
```

Create a **restricted sandbox API key** in the selected sandbox and save it in your backend host's secrets vault as `STRIPE_API_KEY`. Keep it out of chat, public HTML, Git, and build logs. This code does not read or retrieve your existing keys. A Node backend needs secure hosting; GitHub Pages serves static files and cannot run this server.

Give the invoice helper only the permissions for the calls it makes: own-account read, Customers write, Invoices write/read, and, for automatic tax, Tax Settings/Registrations read and Tax Calculations write. Configure a separate webhook-service key with own-account, Invoices, Invoice Payments, and Charges read permissions. Stripe's permission labels may group related reads; validate the restricted key in the sandbox and add only a missing permission reported by Workbench. Neither service needs payout, refund, Connect, or Identity write permissions.

For local development only, copy `.env.example` to `.env` and enter the sandbox key there privately. `.env`, local orders, and database files are ignored by Git. Load it with Node's `--env-file=.env` option. Do not add a real key to `.env.example`.

## Prepare an order

Copy `example-order.json` into the ignored `orders/` directory. Its customer and $12 amount are **example data**, not a real order or a newly approved catalog price. The example deliberately uses `tax.mode: "unconfirmed"` and will refuse to create an invoice until the tax approach is chosen.

Record the agreed items and fees as invoice lines. `unitAmount` and `approvedTotal` are whole cents; `quantity` is a positive whole number. Delivery and shipping arrangements and fees are confirmed by the owner; there is no shipping-rate calculator. Use a new opaque `GGS-...` reference for each order. Keep resident information and other unnecessary private details out of invoice descriptions and references.

Tax configuration has two explicit paths:

- If Lindsey confirms no collection for the order: `"tax": { "mode": "none", "confirmedNoCollection": true }`. This records a decision; it does not determine whether tax is legally owed.
- For Stripe Tax: `"tax": { "mode": "automatic", "codesConfirmed": true, "behavior": "inclusive" }` or `"exclusive"`. Every line needs its confirmed `taxCode`. Supply `fulfillmentAddress` with `country`, `state`, `postal_code`, `line1`, and `city`: the confirmed pickup address for pickup, or the delivery/shipping destination. This is stored as the Customer's shipping address so invoice tax and the preflight calculation use the same place of receipt. Inclusive prices contain tax; exclusive prices add tax to the listed amounts. The resulting total must equal the approved quote.

Run the helper after the order is reviewed:

```sh
node --env-file=.env src/create-draft.mjs orders/my-order.json
```

The output contains only the invoice ID, status, currency, and total. Inspect the draft in the **selected sandbox's Invoices** screen. Check its contents and tax before finalizing. The helper never finalizes, sends, or pays invoices. A hosted invoice URL exists after finalization; share that order's link privately instead of putting it on the public home page.

Retrying the same file reuses its invoice. A changed quote with the same reference is rejected. After an ambiguous request interruption older than 23 hours, reconcile the order reference and draft in Stripe before retrying; Stripe idempotency keys are not a permanent duplicate-prevention database. Keep the ledger on persistent storage and back it up. Do not delete it to bypass a retry block.

## Receive payment events

Start the listener with the endpoint's signing secret securely configured as `STRIPE_WEBHOOK_SECRET`:

```sh
node --env-file=.env src/server.mjs
```

The local endpoint is `POST http://127.0.0.1:8787/webhooks/stripe`. For local testing, forward events from the selected sandbox using Stripe CLI:

```sh
stripe listen --events invoice.finalized,invoice.paid,invoice.payment_failed,invoice.voided,invoice.marked_uncollectible,credit_note.created,credit_note.updated,credit_note.voided,charge.refunded,charge.dispute.created --forward-to http://127.0.0.1:8787/webhooks/stripe
```

Use the signing secret for that exact forwarding session. A deployed endpoint has its own signing secret. Configure a separate HTTPS Node backend with a persistent disk before registering its webhook endpoint. Set `HOST=0.0.0.0` only on that backend host when required. Keep this service separate from the public static site's build output. Single-instance SQLite is the initial storage model; multiple server replicas require a shared transactional database.

Configure the webhook destination to deliver API version `2026-11-18.endive`, matching this SDK integration. Use exactly the events above. The handler returns a non-2xx result for processing failures so Stripe can retry. It records recognized events atomically and does not use the browser's return page as payment proof.

```sh
node --env-file=.env src/list-orders.mjs
```

Only orders with a current, fully paid invoice and matching approved amount can become `paid`. `needs_review` is a persistent manual hold; inspect the invoice, refunds, disputes, or credits in Stripe before considering fulfillment. A developer must explicitly reconcile a held record before any future automation can rely on it. Jotform payment status is not automatically synchronized.

## Validation and limits

`npm test` runs 21 tests with temporary SQLite databases, a mocked Stripe API, and the real SDK's webhook signature implementation. Coverage includes repeated and interrupted creates, expired idempotency windows, concurrent attempts, changed quotes and Dashboard-edited totals, account/mode rejection, incomplete tax setup, invalid collection results, delayed payments, out-of-order events, refunds/disputes, signature tampering, stale signatures, and retryable webhook failures.

This is **not an end-to-end Stripe payment test**. The current sandbox has pending Tax Settings with `head_office` missing and no active registrations. No registration, business address, tax classification, or tax-inclusive/exclusive choice has been set for Lindsey.

Before a live launch: confirm the tax decision and applicable registrations; configure a secure backend, keys and signed webhook; complete a real sandbox hosted-invoice payment and verify the ledger; then review account activation, refund/fulfillment terms, receipts, and production configuration. Live processing requires an explicit implementation change: this starter intentionally accepts only the selected sandbox.

## Prevent key commits

The included `scripts/check-secrets.mjs` checks staged additions without printing matching secrets. Add it to an existing pre-commit hook. If the repository has no hook configuration, enable the supplied hook from the repository root:

```sh
git config core.hooksPath stripe-integration/githooks
```

Keep existing hook configuration if one is already in use. Use the host's secrets vault and separate least-privilege keys even with this extra check.

Official references: [Invoicing integration](https://docs.stripe.com/invoicing/integration), [Hosted Invoice Page](https://docs.stripe.com/invoicing/hosted-invoice-page), [Webhook signatures](https://docs.stripe.com/webhooks#verify-events), [Stripe Tax setup](https://docs.stripe.com/tax/set-up), and [API key management](https://docs.stripe.com/keys-best-practices).
