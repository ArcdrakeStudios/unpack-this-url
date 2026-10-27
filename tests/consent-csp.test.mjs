import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

test('CSP grants only the exact canonical consent CSS hash alongside self styles', async () => {
  const client = await readFile(new URL('../dist/measurement-feedback-client.mjs', import.meta.url), 'utf8');
  const blocks = [...client.matchAll(/styles\.textContent = '([^']+)';/g)];
  assert.equal(blocks.length, 1, 'consent CSS must remain one immutable literal');
  const token = "'sha256-" + createHash('sha256').update(blocks[0][1]).digest('base64') + "'";
  assert.equal(token, "'sha256-VHXTEYUc0+/a/3/pxtfczPbGydBF1J/t2RF/LB9heIo='");
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const policy = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  assert.deepEqual(policy.match(/(?:^|; )style-src ([^;]+)/)[1].split(' '), ["'self'", token]);
  assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/);

});
