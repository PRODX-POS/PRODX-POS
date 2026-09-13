import crypto from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

const scrypt = (secret: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    crypto.scrypt(secret, salt, KEY_LENGTH, {
      N: SCRYPT_N,
      r: SCRYPT_R,
      p: SCRYPT_P,
      maxmem: 32 * 1024 * 1024,
    }, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });

export const hashPassword = async (password: string): Promise<string> => {
  if (!password) throw new Error('Password must not be empty.');
  const salt = crypto.randomBytes(SALT_LENGTH);
  const hash = await scrypt(password, salt);
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${hash.toString('base64url')}`;
};

export const verifyPassword = async (password: string, encoded: string): Promise<boolean> => {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, n, r, p, saltText, hashText] = parts;
  const costN = Number(n);
  const costR = Number(r);
  const costP = Number(p);
  if (costN !== SCRYPT_N || costR !== SCRYPT_R || costP !== SCRYPT_P) return false;

  try {
    const salt = Buffer.from(saltText, 'base64url');
    const expected = Buffer.from(hashText, 'base64url');
    if (salt.length !== SALT_LENGTH || expected.length !== KEY_LENGTH) return false;
    const actual = await scrypt(password, salt);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
};
