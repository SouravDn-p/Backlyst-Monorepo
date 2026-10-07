import { Prisma, PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

type TxClient = PrismaClient | Prisma.TransactionClient;

/**
 * Generates a consistent 64-bit signed integer hash from a string
 * to use as a PostgreSQL advisory lock key.
 */
export function generateAdvisoryLockKey(input: string): bigint {
  const hash = crypto.createHash('sha256').update(input).digest();
  // Use the first 8 bytes for a 64-bit integer
  return hash.readBigInt64LE(0);
}

/**
 * Acquires a transaction-level advisory lock for a single domain.
 * The lock is automatically released at the end of the transaction.
 *
 * Used to serialize operations for a single provider or requester domain
 * to prevent race conditions on velocity limits (e.g. daily/weekly limits).
 */
export async function acquireDomainLock(
  tx: TxClient,
  domain: string,
): Promise<void> {
  if (!domain) return;
  const lockKey = generateAdvisoryLockKey(`domain:${domain}`);
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1)', lockKey);
}

/**
 * Acquires multiple domain locks in a deterministic alphabetical order
 * to prevent deadlocks when a transaction needs to lock both provider
 * and requester domains simultaneously.
 */
export async function acquireMultipleDomainLocks(
  tx: TxClient,
  domains: string[],
): Promise<void> {
  const sorted = Array.from(new Set(domains.filter(Boolean))).sort();
  for (const domain of sorted) {
    await acquireDomainLock(tx, domain);
  }
}

/**
 * Acquires a transaction-level advisory lock for a specific pair of domains.
 * The lock is automatically released at the end of the transaction.
 *
 * Used to serialize operations between a provider and requester to prevent
 * race conditions on repeat-pair and reciprocal limits.
 */
export async function acquirePairLock(
  tx: TxClient,
  domainA: string,
  domainB: string,
): Promise<void> {
  if (!domainA || !domainB) return;
  // Sort to ensure the lock is acquired in a consistent order regardless of direction
  const [a, b] = [domainA, domainB].sort();
  const lockKey = generateAdvisoryLockKey(`pair:${a}:${b}`);
  await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock($1)', lockKey);
}
