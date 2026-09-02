/**
 * Primitivas de criptografia baseadas em Web Crypto — funcionam tanto no
 * runtime Node quanto no Edge (middleware), sem dependências externas.
 */

const encoder = new TextEncoder();

export const PBKDF2_ITERATIONS = 210_000;

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export { toBase64Url, fromBase64Url };

/** Comparação em tempo constante para evitar vazamento por timing. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function randomId(bytes = 16): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return toBase64Url(buffer);
}

/* ---------- Senhas: PBKDF2-SHA256 ---------- */

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as unknown as BufferSource, iterations },
    key,
    256,
  );
}

/** Gera um hash no formato `pbkdf2$<iterações>$<salt>$<hash>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const bits = await derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, rawIterations, rawSalt, rawHash] = stored.split('$');
  if (scheme !== 'pbkdf2' || !rawIterations || !rawSalt || !rawHash) return false;

  const iterations = Number.parseInt(rawIterations, 10);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;

  const bits = await derive(password, fromBase64Url(rawSalt), iterations);
  return safeEqual(toBase64Url(bits), rawHash);
}

/* ---------- Assinatura HMAC-SHA256 ---------- */

export async function hmac(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(signature);
}

/* ---------- Tokens de uso único ---------- */

/**
 * Digest SHA-256 do token de recuperação. O token em claro só existe no link
 * enviado ao usuário; o banco guarda apenas este hash, então vazar o store não
 * permite redefinir a senha de ninguém.
 */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return toBase64Url(digest);
}
