import { describe, expect, it } from 'vitest';

import { hash, verify } from './password.ts';

describe('password', () => {
  it('verifies a hash against the password it was derived from', async () => {
    const stored = await hash('correct horse battery staple');
    expect(await verify('correct horse battery staple', stored)).toBe(true);
  });

  it('fails verification for a wrong password', async () => {
    const stored = await hash('correct horse battery staple');
    expect(await verify('wrong password', stored)).toBe(false);
  });

  it('fails closed — returns false, not a throw — for a malformed stored value', async () => {
    await expect(verify('anything', 'not-a-stored-hash')).resolves.toBe(false);
    await expect(verify('anything', '')).resolves.toBe(false);
    await expect(verify('anything', 'pbkdf2-sha256$0$c2FsdA==$aGFzaA==')).resolves.toBe(false);
    await expect(verify('anything', 'pbkdf2-sha256$not-a-number$c2FsdA==$aGFzaA==')).resolves.toBe(
      false,
    );
  });

  it('fails closed for a tampered stored value', async () => {
    const stored = await hash('correct horse battery staple');
    const [algorithm, iterations, salt, digest] = stored.split('$');
    const tamperedDigest = digest === 'AA' ? 'AB' : 'AA';
    const tampered = `${algorithm}$${iterations}$${salt}$${tamperedDigest}`;
    expect(await verify('correct horse battery staple', tampered)).toBe(false);
  });

  it('salts each hash independently, so hashing the same password twice differs', async () => {
    const first = await hash('correct horse battery staple');
    const second = await hash('correct horse battery staple');
    expect(first).not.toBe(second);
  });

  it('records its algorithm and iteration count in the stored value', async () => {
    const stored = await hash('correct horse battery staple');
    const [algorithm, iterations] = stored.split('$');
    expect(algorithm).toBe('pbkdf2-sha256');
    expect(Number(iterations)).toBeGreaterThan(0);
  });

  it('uses the iteration count recorded in the stored value, not a hardcoded one', async () => {
    // Proves verification reads the count from the value rather than
    // ignoring it: a value re-derived at a different count must not match.
    const stored = await hash('correct horse battery staple');
    const [algorithm, iterations, salt, digest] = stored.split('$');
    const differentCount = Number(iterations) + 1;
    const tampered = `${algorithm}$${differentCount}$${salt}$${digest}`;
    expect(await verify('correct horse battery staple', tampered)).toBe(false);
  });
});
