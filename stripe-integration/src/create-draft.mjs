import { readFile } from 'node:fs/promises';
import { configuration, reportError } from './config.mjs';
import { Ledger } from './store.mjs';
import { createDraft } from './invoices.mjs';

let ledger;
try {
  if (process.argv.length !== 3) throw new Error('Provide one order path.');
  const config = configuration();
  ledger = new Ledger(config.dataDirectory);
  const input = JSON.parse(await readFile(process.argv[2], 'utf8'));
  const invoice = await createDraft(config.stripe, ledger, input);
  console.log(JSON.stringify({ invoiceId: invoice.id, status: invoice.status, currency: invoice.currency, total: invoice.total, sandboxOnly: true }));
} catch (error) { reportError(error); }
finally { ledger?.close(); }
