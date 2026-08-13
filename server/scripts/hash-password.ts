import { hash } from '../src/lib/password.ts';

/**
 * Prints a PBKDF2 stored-format hash for a supplied password, using the
 * project's own password module — not a reimplementation, so the output is
 * guaranteed to verify against it.
 *
 * Run with `node --experimental-strip-types` (.nvmrc pins 22.14.0, which
 * needs the flag), the same way as `gen-openapi.ts`.
 *
 * Usage: node --experimental-strip-types scripts/hash-password.ts '<password>'
 */

const password = process.argv[2];
if (!password) {
  console.error('usage: hash-password.ts <password>');
  process.exit(1);
}

console.log(await hash(password));
