# Public Gobble Gram launch review

## Current status

The existing public Jotform is updated LIVE under Lindsey's explicit approval. Two no-payment browser tests succeeded and both notifications were delivered to gluegunsandgossip@gmail.com.

Website publishing, exact Deluxe bulk prices and card checkout have NOT been activated. The separate website and proposed prices are staged on codex/public-gobble-order-review-20261118 in draft PR #1. Do not merge or deploy without explicit approval.

Existing public form: https://form.jotform.com/263217846661059
Proposed separate public page file: public-gobble-grams.html
Review page file: public-preview.html

## Protected TSR flow

Do not modify TSR form 263168212099056, index.html, gobble-grams.html, shared CSS/JS, CNAME, QR/image files, or the posted QR destination.

Verified main index.html blob unchanged: 40617129ad600c420f708459089c4cf19b2008ab.
Verified CNAME unchanged: 0f3d6116f1e7c26a448fe6d4f5baf9401e0ce48a.

The website branch changes only the two public HTML pages and this note. The root homepage and domain are preserved.

## Live public order form

- Required purchaser full name and email, optional phone.
- Recipient or team name; individual/small order or whole-team/crew order.
- Optional team/company name and recipient/message list.
- Named or anonymous recipient-facing sender; purchaser contact still goes to the organizer.
- Own message or write-one-for-me option, interests/favorite colour, sweet/salty/surprise preference.
- $5 Little Gobble: message and two wrapped treats; optional drink +$2 per gift.
- $8 Gobble Surprise: message, two wrapped treats and surprise 3D gift; optional drink +$2 per gift.
- $12 Deluxe: message, two wrapped treats, included drink and larger surprise 3D gift.
- One required quantity question, default 1, configured minimum 1 / zero decimal places.
- Free arranged pickup in Liberty or Tiffany Springs, or local delivery request; date/time and instructions subject to confirmation.
- Delivery address and food-allergy/scent notes are optional visible questions. Original address/notes fields were hidden without deleting their old data.
- Cash App or Venmo preference and required pending-confirmation/payment acknowledgement.
- Payment is required before preparation AFTER availability, fulfillment, delivery fee if any and final total are confirmed. This is a manual order request, not checkout.

Cash App: $GeeZoMathis — https://cash.app/$GeeZoMathis
Venmo: @Lindsey-Mathis-1 — https://venmo.com/u/Lindsey-Mathis-1
Payment note: purchaser first/last name and Gobble Gram order. No recipient/private delivery data. Pay only once.

## Deluxe-only bulk pricing

The user clarified that the discounts apply ONLY to the $12 Deluxe package. The $5/$8 packages remain at their regular prices.

Live form wording advertises Deluxe discounts at 5+, 10+, 25+, 50+, 100+ gifts, with a confirmed quote before payment. No specific numerical reductions were activated in the live form.

The staged website pages show this PROPOSAL for approval:

| Quantity | Deluxe price per gift |
| --- | --- |
| 1–4 | $12 |
| 5–9 | $11 |
| 10–24 | $10 |
| 25–49 | $9 |
| 50–99 | $8 |
| 100+ | $7 |

This follows Lindsey's $1-per-tier suggestion. Product/labor costs have not been provided, so profitability is not verified.

## Tests and notifications

- Native notification verified enabled with gluegunsandgossip@gmail.com as its only fixed recipient; recheck reported it already correct and unchanged.
- Test 1: submission 6708634356818686871. Five Deluxe team gifts, own message, Liberty pickup, Venmo preference. Browser thank-you and delivered business-inbox notification verified.
- Test 2: submission 6708648506818567691. One $8 gift plus optional $2 drink, anonymous sender, write-one-for-me, local-delivery request, Cash App preference. Browser thank-you and delivered business-inbox notification verified.
- The final test email includes purchaser full name/email, recipient, message option, package, quantity, drink, delivery address/instructions, food/scent notes and payment preference.
- Both records are labelled TEST ONLY — DO NOT FULFILL — NO PAYMENT. No money sent or actual fulfillment requested.
- The original purchaser fields were repaired after the first notification omitted contact; the final notification confirms the repair.
- Required-field validation and zero-quantity rejection were tested. Zero displays a minimum-value error.
- Integer-only enforcement is not fully proven; native step is any. Do not claim all fractional-input cases were tested.
- All website form links target the SAME existing public form. No duplicate website builder.
- Catalog images and the Deluxe ladder rendered in the browser; anchor/HTML checks passed.
- Gmail business inbox was verified in the authorized browser because the Gmail plugin is connected to the personal inbox.

## Limits and launch steps

- This workflow confirms orders and totals manually; there is no automatic discount calculation or payment reconciliation.
- Delivery address is not conditionally required. Missing details must be resolved during confirmation before accepting payment.
- Native Jotform browser settings did not retain Google sign-in; connected Jotform editing completed the saved field/settings work. Custom subject/body/thank-you text was not verified; the delivered default notification is adequate and includes final order answers.
- The live form remains the existing enabled form. The website pages have NOT been published from this branch, and card checkout remains off.

After explicit approval of prices and publication:
1. Add the approved Deluxe unit-price ladder to the existing live form's bulk explanation, preserving manual confirmation and regular $5/$8 prices.
2. Publish the separate public-gobble-grams.html page from the reviewed branch. Do not replace root index.html or alter the posted QR.
3. Confirm only the public HTML pages/note differ, then merge/publish and verify the separate page's direct URL.
4. Do not activate card checkout without a separate explicit instruction.
