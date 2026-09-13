import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword } from './password';

test('password hashes are salted and verifiable without storing plaintext', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');

  assert.notEqual(first, second);
  assert.match(first, /^scrypt\$16384\$8\$1\$/);
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});

test('password verifier rejects malformed or unsupported hashes', async () => {
  assert.equal(await verifyPassword('secret', ''), false);
  assert.equal(await verifyPassword('secret', 'bcrypt$10$bad'), false);
  assert.equal(await verifyPassword('secret', 'scrypt$1$1$1$c2FsdA$aGFzaA'), false);
});
