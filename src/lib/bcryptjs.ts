import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export async function hash(password: string, rounds = 10): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${key}`;
}

export async function compare(password: string, hashStr: string): Promise<boolean> {
  const [salt, key] = hashStr.split(':');
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const hashed = Buffer.from(key, 'hex');
  return timingSafeEqual(derived, hashed);
}
