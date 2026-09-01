import 'server-only';

/**
 * Limitador de tentativas em memória para o login.
 * Suficiente para uma instância; em cluster, troque por Redis/Upstash.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos
const BLOCK_MS = 5 * 60 * 1000; // 5 minutos de bloqueio

interface Entry {
  failures: number;
  firstFailureAt: number;
  blockedUntil: number;
}

const attempts = new Map<string, Entry>();

function prune(now: number) {
  for (const [key, entry] of attempts) {
    const expired = now - entry.firstFailureAt > WINDOW_MS && entry.blockedUntil < now;
    if (expired) attempts.delete(key);
  }
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  prune(now);

  const entry = attempts.get(key);
  if (entry && entry.blockedUntil > now) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function registerFailure(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.firstFailureAt > WINDOW_MS) {
    attempts.set(key, { failures: 1, firstFailureAt: now, blockedUntil: 0 });
    return;
  }

  entry.failures += 1;
  if (entry.failures >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
    entry.failures = 0;
    entry.firstFailureAt = now;
  }
}

export function resetRateLimit(key: string) {
  attempts.delete(key);
}
