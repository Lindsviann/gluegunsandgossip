const order = document.getElementById('gobble-order');
const fields = order.elements;
const treatSection = document.getElementById('treat-section');
const extras = document.getElementById('extras-section');
const treat = document.getElementById('treat-option');
const treatNote = document.getElementById('treat-note');
const printInputs = Array.from(fields.print);
const summary = document.getElementById('order-summary');
const hint = document.getElementById('order-hint');
const actionBar = document.getElementById('order-actions');

const smallTreats = ['Mini chocolate', 'Sucker'];
const fullSizeTreats = [
  'Hershey’s Milk Chocolate',
  'Reese’s',
  'Hershey’s with Almonds',
  'Kit Kat',
  'Rice Krispies Treat',
];
const treatsByTier = {
  '$1': [...smallTreats, 'Skip candy'],
  '$2': fullSizeTreats,
  '$3': [...smallTreats, 'Skip candy'],
  '$5': [...smallTreats, ...fullSizeTreats, 'Skip candy'],
};

function withPrint(tier) {
  return tier === '$3' || tier === '$5';
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
  treatNote.textContent = tier === '$2'
    ? 'The package photo shows a full-size Hershey’s bar.'
    : 'Mini chocolates and sucker flavors are assorted.';
}

function syncOrder(event) {
  let tier = fields.tier.value;
  if (event?.target.name === 'print' && !withPrint(tier)) {
    fields.tier.value = '$3';
    tier = '$3';
  }

  if (!withPrint(tier)) {
    const selectedPrint = printInputs.find(input => input.checked);
    if (selectedPrint) selectedPrint.checked = false;
  }
  printInputs[0].required = withPrint(tier);
  showFieldset(treatSection, Boolean(tier));
  showFieldset(extras, tier === '$5');
  updateTreatOptions(tier);

  actionBar.classList.toggle('is-active', Boolean(tier));
  summary.textContent = tier ? tier + ' Gobble Gram' : 'Your Gobble Gram';
  hint.textContent = !tier ? 'Pick a package to get started.'
    : [
      treat.value || 'Pick a treat',
      withPrint(tier) ? fields.print.value || 'Pick one print' : '',
      tier === '$5' && fields.pen.value !== 'Surprise me' ? fields.pen.value + ' topper' : '',
    ].filter(Boolean).join(' · ');
}

order.addEventListener('change', syncOrder);
window.addEventListener('pageshow', syncOrder);
syncOrder();
order.querySelector('button[type="submit"]').disabled = false;

order.addEventListener('submit', event => {
  event.preventDefault();
  const tier = fields.tier.value;
  const details = [
    'Card: ' + fields.card.value,
    'Treat: ' + treat.value,
  ];
  if (withPrint(tier)) details.push('3D print: ' + fields.print.value);
  if (tier === '$5') {
    details.push('Mini pen topper: ' + fields.pen.value);
    details.push('Drink preference: ' + (fields.drink.value.trim() || 'Any available'));
  }

  const formUrl = new URL(order.action);
  formUrl.searchParams.set('q6_radio4', tier);
  formUrl.searchParams.set('q12_textarea10', details.join('\n'));
  // Jotform's long text prefill expects percent-encoded spaces.
  formUrl.search = formUrl.search.replaceAll('+', '%20');
  window.location.assign(formUrl.href);
});

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
