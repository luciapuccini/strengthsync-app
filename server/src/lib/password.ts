/**
 * Password hashing via PBKDF2-SHA256 over WebCrypto — bcrypt/argon2 are not
 * available on Workers. The stored value is self-describing
 * (`pbkdf2-sha256$iterations$salt$hash`, salt/hash base64) so the iteration
 * count can change later without invalidating hashes already stored.
 *
 * Iteration count — measured, not copied from general guidance: 30,000,
 * chosen from a PBKDF2-SHA256 benchmark on this runtime (Node 22, WebCrypto
 * `deriveBits`) showing a median ~4.6ms / worst-of-9 ~4.8ms per derivation.
 * The Workers free plan caps a request at 10ms CPU time, and hashing runs at
 * most once per request (sign-up or sign-in); 30,000 leaves more than half
 * that budget for everything else the request does (JSON parsing, the D1
 * write, JWT issuance), with margin for the Workers isolate running slower
 * than the machine this was measured on. This is well under general-purpose
 * PBKDF2 recommendations (OWASP currently suggests 600,000+), which assume
 * no per-request CPU ceiling — here the CPU budget is the binding
 * constraint, not the general recommendation. Re-measure if that budget
 * changes (e.g. a paid Workers plan).
 */

const ALGORITHM = 'pbkdf2-sha256';
const ITERATIONS = 30_000;
const SALT_BYTES = 16;
const KEY_LENGTH_BITS = 256;

const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveBits(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    KEY_LENGTH_BITS,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] as number) ^ (b[i] as number);
  return diff === 0;
}

/** Hash a password into a self-describing stored value, salted per call. */
export async function hash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const digest = await deriveBits(password, salt, ITERATIONS);
  return `${ALGORITHM}$${ITERATIONS}$${toBase64(salt)}$${toBase64(digest)}`;
}

/**
 * Verify a password against a stored value. Fails closed: a malformed,
 * truncated or tampered stored value returns false rather than throwing.
 */
export async function verify(password: string, stored: string): Promise<boolean> {
  try {
    const parts = stored.split('$');
    const [algorithm, iterationsPart, saltPart, digestPart] = parts;
    if (
      parts.length !== 4 ||
      algorithm !== ALGORITHM ||
      iterationsPart === undefined ||
      saltPart === undefined ||
      digestPart === undefined
    ) {
      return false;
    }
    const iterations = Number(iterationsPart);
    if (!Number.isInteger(iterations) || iterations <= 0) return false;

    const salt = fromBase64(saltPart);
    const expected = fromBase64(digestPart);
    const actual = await deriveBits(password, salt, iterations);
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}
