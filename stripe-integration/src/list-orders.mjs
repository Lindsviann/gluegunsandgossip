import { resolve } from 'node:path';
import { Ledger } from './store.mjs';

const ledger = new Ledger(resolve(process.env.DATA_DIRECTORY || './data'));
try { console.table(ledger.list()); }
finally { ledger.close(); }
