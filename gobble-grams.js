const order = document.getElementById('gobble-order');
const fields = order.elements;
const paymentStart = document.getElementById('payment-start');
const paymentNext = document.getElementById('payment-next-step');
const paymentSteps = {
  'Cash': 'After submitting, give cash to Lindsey or Carrie and tell them the sender name on your order.',
  'Cash App': 'After submitting, send your total to $GeeZoMathis on Cash App. Include your first and last name and “Gobble Gram order”; no resident details.',
  'Venmo': 'After submitting, send your total to @Lindsey-Mathis-1 on Venmo. Include your first and last name and “Gobble Gram order”; no resident details.',
  'Apple Cash by text': 'After submitting, text 816-868-6363 to coordinate Apple Cash. Include your sender name and “Gobble Gram order”; no resident details.'
};
const residentNote = 'Free resident note';
const treatSection = document.getElementById('treat-section');
const extras = document.getElementById('extras-section');
const simmerSection = document.getElementById('simmer-add-on');
const addonNone = document.getElementById('addon-none');
// Weekly promotion is manually managed; no unconfirmed calendar cutoff.
const simmerOfferEnabled = true;
const simmerOfferActive = () => simmerOfferEnabled;
const printSection = document.getElementById('prints');
const printNav = document.getElementById('print-nav');
const treat = document.getElementById('treat-option');
const treatNote = document.getElementById('treat-note');
const printInputs = Array.from(fields.print);
const summary = document.getElementById('order-summary');
const hint = document.getElementById('order-hint');
const actionBar = document.getElementById('order-actions');

const smallTreats = ['Assorted small candies', 'Mini chocolates', 'Suckers'];
const fullSizeTreats = [
  'Hershey’s Milk Chocolate',
  'Reese’s',
  'Hershey’s with Almonds',
  'Kit Kat',
  'Rice Krispies Treat',
  'M&M’s Milk Chocolate',
  'M&M’s Peanut',
  'Dot’s Original Pretzels',
  'Cheez-It Extra Toasty',
  'Gardetto’s Original Recipe',
  'KIND Breakfast Protein Blueberry Almond',
];
const treatsByTier = {
  '$1': [],
  '$2': ['Assorted mini candies', 'Cheez-It Extra Toasty', 'Dot’s Original Pretzels'],
  '$3': ['Assorted mini candies'],
  '$5': fullSizeTreats,
};

function withPrint(tier) {
  return tier === '$5';
}

function showFieldset(fieldset, show) {
  fieldset.disabled = !show;
  fieldset.hidden = !show;
}

function updateTreatOptions(tier) {
  if (treat.dataset.tier === tier) return;

  const previous = treat.value;
  const options = treatsByTier[tier] ?? [];
  treat.replaceChildren(new Option('Choose a treat', ''), ...options.map(value => new Option(value)));
  treat.value = options.includes(previous) ? previous : '';
  treat.dataset.tier = tier;
  document.getElementById('treat-label').textContent = 'Choose your candy or snack';
  treatNote.textContent = 'Includes one candy or snack. Subject to availability.';
}

function syncOrder(event) {
  let tier = fields.tier.value;
  if (event?.target.name === 'print' && !withPrint(tier)) {
    fields.tier.value = '$5';
    tier = '$5';
  }

  if (!withPrint(tier)) {
    const selectedPrint = printInputs.find(input => input.checked);
    if (selectedPrint) selectedPrint.checked = false;
  }
  const free = tier === residentNote;
  showFieldset(paymentStart, !free || fields.addon.value !== 'No add-on');
  document.getElementById('free-payment-note').hidden = !free || fields.addon.value !== 'No add-on';
  paymentNext.textContent = paymentSteps[fields.payment.value] || 'Your payment choice will carry to the order form. Free resident notes need no payment.';
  const showAddOn = Boolean(tier) && simmerOfferActive();
  showFieldset(simmerSection, showAddOn);
  if (!showAddOn) addonNone.checked = true;
  const selectedAddOn = showAddOn && fields.addon.value !== 'No add-on' ? fields.addon.value : '';
  const addonPrice = selectedAddOn.includes('+$4') ? 4 : selectedAddOn ? 2 : 0;
  printInputs[0].required = withPrint(tier);
  showFieldset(treatSection, ['$2', '$3', '$5'].includes(tier));
  showFieldset(printSection, !free);
  printNav.hidden = free;
  showFieldset(extras, ['$3', '$5'].includes(tier));
  const otherDrink = ['$3', '$5'].includes(tier) && fields.drink.value === 'Other — write in request';
  document.getElementById('other-drink-wrap').hidden = !otherDrink;
  fields.otherDrink.disabled = !otherDrink;
  updateTreatOptions(tier);

  actionBar.classList.toggle('is-active', Boolean(tier));
  const total = (tier && !free ? Number(tier.slice(1)) : 0) + addonPrice;
  summary.textContent = tier ? '$' + total + ' total · ' + (free ? residentNote : tier + ' Gobble Gram') : 'Your Gobble Gram';
  hint.textContent = !tier ? 'Browse here or go straight to the order form.'
    : free ? 'Personalized note · ' + (selectedAddOn || 'No extras')
    : [
      ['$2', '$3', '$5'].includes(tier) ? treat.value || 'Pick a treat' : 'Personalized message only',
      withPrint(tier) ? fields.print.value || 'Pick one print' : '',
      ['$3', '$5'].includes(tier) ? fields.drink.value || 'Pick a drink' : '',
      selectedAddOn || '',
    ].filter(Boolean).join(' · ');
  updateOrderLink();
}

order.addEventListener('change', syncOrder);
window.addEventListener('pageshow', syncOrder);
syncOrder();

function updateOrderLink() {
  const tier = fields.tier.value;
  const details = ['Card: ' + fields.card.value];
  if ((tier !== residentNote || fields.addon.value !== 'No add-on') && fields.payment.value) details.push('Planned payment: ' + fields.payment.value + ' (verified manually; not charged by this form)');
  if (['$2', '$3', '$5'].includes(tier) && treat.value) details.push('Treat preference: ' + treat.value);
  if (withPrint(tier) && fields.print.value) details.push('3D print: ' + fields.print.value);
  if (['$3', '$5'].includes(tier)) {
    details.push('Drink preference: ' + (fields.drink.value.trim() || 'Any available'));
    if (fields.drink.value === 'Other — write in request') details.push('Requested drink (subject to availability): ' + (fields.otherDrink.value.trim() || 'Please specify'));
  }
  const selectedAddOn = tier && simmerOfferActive() && fields.addon.value !== 'No add-on' ? fields.addon.value : '';
  const addonPrice = selectedAddOn.includes('+$4') ? 4 : selectedAddOn ? 2 : 0;
  if (selectedAddOn) details.push('A Little Extra Gobble: ' + selectedAddOn);
  if (selectedAddOn.includes('3D print')) details.push('Extra 3D print choice: please specify here.');
  if (tier) details.push('Total due: $' + ((tier === residentNote ? 0 : Number(tier.slice(1))) + addonPrice));
  if (['$2', '$3', '$5'].includes(tier) && !treat.value) details.push('Treat: please specify your choice here.');
  if (withPrint(tier) && !fields.print.value) details.push('3D print: please specify your choice here.');
  const formUrl = new URL(order.action);
  if (tier) formUrl.searchParams.set('q6_radio4', tier);
  if ((tier !== residentNote || fields.addon.value !== 'No add-on') && fields.payment.value) formUrl.searchParams.set('paymentMethod', fields.payment.value);
  if (['$3', '$5'].includes(tier) && fields.drink.value) formUrl.searchParams.set('drinkChoice', fields.drink.value);
  if (['$3', '$5'].includes(tier) && fields.drink.value === 'Other — write in request') formUrl.searchParams.set('requestedDrink', fields.otherDrink.value.trim());
  formUrl.searchParams.set('thisWeeks', selectedAddOn || 'No add-on');
  formUrl.searchParams.set('q12_textarea10', details.join('\n'));
  formUrl.search = formUrl.search.replaceAll('+', '%20');
  document.getElementById('continue-order').href = formUrl.href;
}
order.addEventListener('input', syncOrder);

const copyButton = document.getElementById('copy-cashtag');
copyButton.addEventListener('click', async () => {
  const cashtag = document.getElementById('cashtag').textContent.trim();
  try {
    await navigator.clipboard.writeText(cashtag);
    copyButton.textContent = 'Copied';
  } catch {
    copyButton.textContent = cashtag;
  }
});