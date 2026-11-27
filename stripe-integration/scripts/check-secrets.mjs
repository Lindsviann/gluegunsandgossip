import { execFileSync } from 'node:child_process';

const added = execFileSync('git', ['diff', '--cached', '--no-ext-diff', '--unified=0', '--', '.'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
  .split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).join('\n');
if (/\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b|\bwhsec_[A-Za-z0-9]{16,}\b/.test(added)) {
  console.error('Commit blocked: a staged addition resembles a Stripe key or webhook signing secret. Move it to secure configuration.');
  process.exitCode = 1;
}
