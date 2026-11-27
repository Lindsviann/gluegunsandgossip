import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { SetupError } from './config.mjs';

export class Ledger {
  constructor(directory) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(join(directory, 'orders.sqlite'));
    this.db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS orders (
        ref TEXT PRIMARY KEY, invoice_id TEXT UNIQUE, state TEXT NOT NULL,
        record TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS leases (ref TEXT PRIMARY KEY, owner TEXT NOT NULL, expires INTEGER NOT NULL);
    `);
  }
  get(ref) {
    const row = this.db.prepare('SELECT record FROM orders WHERE ref=?').get(ref);
    return row ? JSON.parse(row.record) : null;
  }
  byInvoice(id) {
    const row = this.db.prepare('SELECT record FROM orders WHERE invoice_id=?').get(id);
    return row ? JSON.parse(row.record) : null;
  }
  save(record) {
    this.db.prepare(`INSERT INTO orders(ref,invoice_id,state,record) VALUES(?,?,?,?)
      ON CONFLICT(ref) DO UPDATE SET invoice_id=excluded.invoice_id,state=excluded.state,record=excluded.record`)
      .run(record.orderRef, record.steps?.invoice || null, record.state, JSON.stringify(record));
  }
  list() {
    return this.db.prepare('SELECT ref AS orderRef, invoice_id AS invoiceId, state FROM orders ORDER BY ref').all();
  }
  async locked(ref, operation) {
    const owner = randomUUID();
    const now = Date.now();
    const result = this.db.prepare(`INSERT INTO leases(ref,owner,expires) VALUES(?,?,?)
      ON CONFLICT(ref) DO UPDATE SET owner=excluded.owner,expires=excluded.expires WHERE leases.expires < ?`)
      .run(ref, owner, now + 15 * 60 * 1000, now);
    if (!result.changes) throw new SetupError('This order is already being prepared. Wait for the other process to finish.');
    try { return await operation(); }
    finally { this.db.prepare('DELETE FROM leases WHERE ref=? AND owner=?').run(ref, owner); }
  }
  hasEvent(id) { return Boolean(this.db.prepare('SELECT id FROM events WHERE id=?').get(id)); }
  applyEvent(id, changes) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (!this.hasEvent(id)) {
        for (const change of changes) {
          const current = this.get(change.orderRef);
          // A refund, dispute, credit note or total mismatch needs manual resolution.
          // Later delivery of an older payment event must not clear that hold.
          const state = current.state === 'needs_review' ? 'needs_review'
            : current.state === 'paid' && change.state !== 'needs_review' ? 'paid' : change.state;
          this.save({ ...current, state });
        }
        this.db.prepare('INSERT OR IGNORE INTO events(id) VALUES(?)').run(id);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  close() { this.db.close(); }
}
