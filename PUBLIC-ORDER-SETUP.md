# Public Gobble Gram launch review

## Authorization and boundaries

Lindsey approved LIVE edits to existing public Jotform 263217846661059, notification setup, and no-payment testing. Website publication and paid/card checkout still require explicit approval.

Do not modify the TSR form 263168212099056, index.html, gobble-grams.html, shared CSS/JS, CNAME, existing QR code or QR destination. The public website review changes only public-preview.html and this setup note on branch codex/public-gobble-order-review-20261118. Do not merge or deploy yet.

## Existing public form

https://form.jotform.com/263217846661059

Saved working fields include package choices ($5 Little Gobble / $8 Gobble Surprise / $12 Deluxe), purchaser details, recipient or team name, individual/team order type, team recipient/message notes, sender/anonymous choice, own-message/write-one choice, preferences, quantity, fulfillment, manual payment choice and acknowledgement.

- $5: message and two wrapped treats; optional drink +$2 per gift.
- $8: message, two wrapped treats and surprise 3D gift; optional drink +$2 per gift.
- $12: message, two wrapped treats, included drink and larger surprise 3D gift.
- Final availability, fulfillment, delivery fee if applicable and total are confirmed before payment.
- Free arranged pickup in Liberty or Tiffany Springs; local delivery by arrangement.
- The form collects a request, not an automatic payment.
- Cash App: $GeeZoMathis, https://cash.app/$GeeZoMathis
- Venmo: @Lindsey-Mathis-1, https://venmo.com/u/Lindsey-Mathis-1
- Payment note: purchaser first/last name and Gobble Gram order; no recipient/private delivery information.
- No card gateway was activated.

## Deluxe bulk clarification

Whole-team/crew ordering is available. Bulk discounts apply ONLY to the $12 Deluxe package, at 5+, 10+, 25+, 50+, 100+ gifts. The $5/$8 prices do not receive this discount.

The live form and website draft say that a discounted quote is confirmed before payment. No numerical discount was activated.

Proposed ladder for owner review only:

| Quantity | Deluxe unit price |
| --- | --- |
| 1–4 | $12 |
| 5–9 | $11 |
| 10–24 | $10 |
| 25–49 | $9 |
| 50–99 | $8 |
| 100+ | $7 |

This follows Lindsey's suggested $1-per-tier idea. Actual product/labor costs and profitability have not been supplied or verified; do not describe these prices as guaranteed profitable. Obtain price approval before showing these specific amounts publicly.

## Notification and test evidence

- Jotform reported Notification 1 enabled with only gluegunsandgossip@gmail.com as recipient.
- Test submission 6708634356818686871 succeeded in the browser, with a Thank You confirmation. It is labelled TEST ONLY — DO NOT FULFILL — NO PAYMENT.
- Test: 5 Deluxe gifts, team/crew order, own message, Liberty pickup, Venmo preference, no actual payment or preparation.
- The corresponding Jotform email was found and read in the actual gluegunsandgossip@gmail.com Gmail inbox. It contains team, package, quantity, message, fulfillment and payment preference.
- The email omits the original purchaser name/email even though the submission data itself contains them. A live repair request to replace the original purchaser/contact/address/allergy questions is currently processing; verify its result and send a second labelled test before calling that repair complete.
- The connected Gmail plugin account is lindsviann@gmail.com; the business inbox was verified through the authorized browser after Google verification.
- Jotform browser settings did not retain the Google sign-in. Do not claim native builder access succeeded.

## Validation

- Browser verified empty required fields are rejected.
- The original Quantity allowed zero. It was replaced with one required Quantity question, default 1 and configured minimum 1 / zero decimal places.
- Browser verified zero is now rejected with "Input should not be less than the minimum value: 1."
- Integer-only enforcement is not yet proven. Native number input uses step=any; a 1.5 validation check needs follow-up.
- Conditional hiding/required-address logic, custom subtotal, and custom thank-you text have not been verified. The current flow uses manual confirmation/quoting, not automatic checkout. Do not claim those features are complete.
- Website review rendered with catalog images loaded and the correct public-form links.

## Next actions

1. Wait for the purchaser/contact repair to finish; inspect current form.
2. Submit a second clearly labelled no-payment test, covering Cash App and purchaser contact delivery in the notification.
3. Verify the resulting order data and business-inbox notification.
4. Record remaining verification limitations accurately.
5. Obtain approval for exact Deluxe price ladder and separate website publication.
6. Before publishing, remove review-only banner/copy and verify the final diff still excludes all protected TSR/domain/QR files.
