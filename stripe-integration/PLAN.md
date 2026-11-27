# Glue Guns & Gossip - Stripe integration plan

Prepared November 27, 2026 for **Gluegunsandgossip.com** and the user-selected **Glue guns and Gossip sandbox** (`acct_1UgAB3BkWqjHeQ9T`, test data only).

## Planner result

Stripe's implementation planner was called with the complete eight-product request, the home craft business model, and the existing static website/manual confirmation constraints. Guide `iguide_61Vpq8Y0vtfP7cOJl41BkWqjHeQ9T` was confirmed **accepted**. Its selected blueprint is **Invoice payment with hosted page**.

The selected path uses unique, owner-created invoices, an opaque order reference, customer-initiated hosted payment, and Dashboard reconciliation. Invoice API automation is provided as an owner-operated draft helper, while Dashboard creation remains the lowest-maintenance option. The planner returned detailed decision trees for Payments/Invoicing only. The other six requested areas are preserved below and evaluated using Stripe's current product documentation and guidance; they are not claimed as additional accepted planner blueprints.

## Review of the existing setup

The reviewed GitHub default-branch snapshot was `5044ce4b3d81494666307f4ba6fcd32e799acab0` in `Lindsviann/gluegunsandgossip`.

- The homepage has separate public shop links for Grinch Grams, elf kits, and crafts, plus a separate staff hub.
- The reviewed shop pages use Jotform preorder requests or email. Availability, delivery/shipping fees, and final totals are confirmed before payment.
- The source tree contains buildless static HTML/JS, and no Stripe integration was found in the reviewed shop files. No backend project or secret-handling facility was present in that tree.
- Retain the custom domain, posted QR URLs, public/staff separation, existing forms, and manual confirmation before collecting payment. Do not attach staff drawings or auctions to this craft payment flow.
- Use a private order-specific hosted invoice link after confirmation. A reusable public link would let customers pay before stock/customization and fees are agreed, so it is not the first choice for current custom orders.

## All eight requested products

| Requested product | Recommendation for this business | Status and decision needed |
| --- | --- | --- |
| Payments | Collect one-time craft payments on Stripe's hosted invoice page. Use dynamic payment methods configured in Stripe. Payment Links are a later option for fixed, approved products. | Draft invoice code prepared. Secure key setup, tax choice, and a hosted payment test remain. |
| Invoicing | Create an itemized draft after confirming an order, then review and finalize in the Dashboard. Send/share its hosted payment link privately. | Initial implementation, without automatic email sending or charging. |
| Tax | Confirm collection approach, classifications, price behavior, and actual registrations; verify calculations before claiming tax works. | Sandbox settings are pending (`head_office` missing); active registrations returned empty. No settings changed. |
| Billing | Add subscription Checkout and Customer Portal if a recurring craft box or membership is actually offered. | Frequency, recurring product, price, cancellation/renewal terms, and fulfillment capacity are unspecified. No subscription created. |
| Connect | Consider it if other makers sell through the site and the business routes their payments or payouts. Selling Lindsey's own products does not establish that platform requirement. | Clarify whether there will be other sellers and who receives funds before choosing the Connect architecture. No seller accounts or transfers created. |
| Terminal | Add in-person collection for craft fairs or pickup sales. Evaluate Stripe's ready-made app/Tap to Pay before building a custom POS. | Confirm phone/reader, where sales happen, and supported device availability. No hardware ordered or Terminal location registered. |
| Identity | Add document/selfie verification only for a defined verification need. Ordinary craft shoppers have no stated document-verification requirement. Merchant account activation is a separate Stripe onboarding process. | Define whom to verify and why, plus consent/data retention requirements. No customer ID collection added. |
| Usage-based billing | If a future service is priced by measured consumption, define its billable unit and billing schedule; Stripe guidance favors Metronome for new usage integrations. Craft order quantities are ordinary line-item quantities. | No metered service, usage source, rate, minimum, or maximum has been specified. No meter or usage billing created. |

## Implementation architecture

1. A customer submits the existing order request.
2. Lindsey confirms stock/customization, pickup/delivery/shipping, itemized charges, tax treatment, and the final quote.
3. An owner creates a draft in Stripe Dashboard or runs the backend draft helper with that reviewed order file.
4. Stripe hosts the invoice and payment entry. The owner reviews before finalizing or sending it.
5. A signed webhook records the latest invoice state in a persistent ledger. Preparation/fulfillment remains manual after checking payment in Stripe.

The public GitHub Pages site remains static. The optional automation runs on a separate secure Node backend with persistent storage. API keys and webhook signing secrets belong in that backend's secrets vault, never in the repository or public browser code. Use separate restricted keys for drafting and read-only event reconciliation. No public endpoint accepts prices or invoice-creation commands.

Stripe SDK `23.2.0` and its API version `2026-11-18.endive` were verified against the installed official package. The source pins the SDK, includes a lockfile, and rejects live keys, other accounts, and live events. It preserves raw webhook bytes and uses the SDK's signature verifier.

The durable ledger prevents repeated local orders, persists each Stripe resource ID, and uses stable per-step idempotency keys for ambiguous network retries. It stops an unresolved retry before the usual Stripe idempotency retention period can expire. An operator must keep/back up the ledger and reconcile interrupted work before clearing any block.

For invoice events, retrieve the invoice's current state rather than trusting delivery order. A recognized paid invoice must match the expected currency and approved final total. Refunds/disputes are resolved through Stripe's Invoice Payment/PaymentIntent relationship; credit notes carry their invoice reference. These events set a manual hold that a later payment event cannot clear. There is no automatic fulfillment side effect.

## Tax readiness

The account inspection applies **only to the chosen sandbox**, not to the live account. Stripe Tax currently has no configured head office, preset tax code, default tax behavior, or active registration there. Stripe collects no tax in a jurisdiction until an applicable registration is recorded. Adding a registration in Stripe records an existing registration; it does not register the business with the tax authority.

Stripe's tax-code search returned **General - Tangible Goods (`txcd_99999999`)** as a possible broad classification for physical trinkets. This is an unselected candidate, not a confirmed classification. Kits containing food, scented products, or other items may need different treatment. Confirm the correct code before using it; the implementation does not assign one by default. See the [Tax Codes API](https://docs.stripe.com/api/tax_codes).

For automatic collection, the helper requires the owner's explicit classification and inclusive/exclusive choice, active Tax Settings, an active matching US state sales-tax registration, a confirmed pickup/destination address for physical goods, and a sandbox calculation. The same address is used for Customer shipping and calculation location. It checks `taxability_reason`, rejects `not_collecting` and empty results, and accepts properly explained exempt/zero results. It also requires the calculated final amount to match the reviewed quote. No real calculation has been run for this business yet because the required inputs/setup are missing.

The business determines its actual registration obligations with qualified tax guidance. The missing business address must be entered privately in Stripe; it must not be copied into this public repository. [Next steps for Stripe Tax](https://docs.stripe.com/tax/set-up).

## What is complete and what remains

Complete: accepted planner guide; current-source review; all eight products evaluated; selected sandbox inspected; invoice/webhook code and local tests prepared.

Remaining before an end-to-end test: confirm Lindsey's tax approach, securely configure a restricted key for this sandbox, and configure its webhook signing secret. The draft helper deliberately stops when tax is unconfirmed. No customer, invoice, product, payment, tax setting, registration, webhook destination, or recurring agreement was created in Stripe during this work.

Remaining before public acceptance of card payments: deploy the backend with durable storage and HTTPS if using automation, complete hosted invoice payment and replay tests in the sandbox, separately review live account activation/tax/refund/fulfillment requirements, and explicitly promote a reviewed configuration to live mode. Additional products need their business requirements resolved as listed above.

## Current Stripe references

- [Payments](https://docs.stripe.com/payments) and [dynamic payment methods](https://docs.stripe.com/payments/payment-methods/dynamic-payment-methods)
- [Dashboard invoicing](https://docs.stripe.com/invoicing/dashboard), [API invoicing](https://docs.stripe.com/invoicing/integration), and [Hosted Invoice Page](https://docs.stripe.com/invoicing/hosted-invoice-page)
- [Billing](https://docs.stripe.com/billing), [Customer Portal](https://docs.stripe.com/customer-management/integrate-customer-portal), and [new usage-based billing](https://docs.stripe.com/billing/usage-based)
- [Connect](https://docs.stripe.com/connect)
- [Stripe Tax setup](https://docs.stripe.com/tax/set-up) and [tax-code selection](https://docs.stripe.com/tax/tax-codes)
- [Terminal overview](https://docs.stripe.com/terminal/overview) and [ready-made apps](https://docs.stripe.com/terminal/payments/ready-made-apps)
- [Identity](https://docs.stripe.com/identity)
- [Secret key management](https://docs.stripe.com/keys-best-practices) and [webhooks](https://docs.stripe.com/webhooks)
