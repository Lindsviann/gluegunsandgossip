import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { configuration, reportError, verifyAccount } from './config.mjs';
import { Ledger } from './store.mjs';
import { processEvent } from './events.mjs';

export function webhookServer({ stripe, ledger, webhookSecret }) {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (request.url !== '/webhooks/stripe') { response.writeHead(404).end('{}'); return; }
    if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); response.writeHead(405).end('{}'); return; }
    try {
      const chunks = [];
      let bytes = 0;
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 1024 * 1024) { response.writeHead(413).end('{}'); return; }
        chunks.push(chunk);
      }
      let event;
      try {
        // Preserve the original bytes. Never JSON-parse before signature verification.
        event = stripe.webhooks.constructEvent(Buffer.concat(chunks), request.headers['stripe-signature'], webhookSecret);
        if (event.livemode !== false || event.account) throw new Error('Wrong mode or account.');
      } catch { response.writeHead(400).end('{"error":"Invalid sandbox event"}'); return; }
      await processEvent(stripe, ledger, event);
      response.writeHead(200).end('{"received":true}');
    } catch {
      // Stripe retries a non-2xx response. Never log payloads, signatures, keys or PII.
      response.writeHead(500).end('{"error":"Retry later"}');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const config = configuration(process.env, true);
    await verifyAccount(config.stripe);
    const ledger = new Ledger(config.dataDirectory);
    const server = webhookServer({ ...config, ledger });
    server.requestTimeout = 30000;
    server.on('error', reportError);
    server.listen(config.port, config.host, () => console.log('Sandbox webhook listener started.'));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close(() => { ledger.close(); process.exit(0); }));
  } catch (error) { reportError(error); }
}
