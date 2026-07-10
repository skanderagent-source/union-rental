import { vi } from 'vitest';

export type SupabaseResult = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
};

export function createThenableChain(result: SupabaseResult) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () => chain;
  for (const method of [
    'select',
    'eq',
    'neq',
    'or',
    'is',
    'not',
    'in',
    'order',
    'range',
    'limit',
    'maybeSingle',
    'insert',
    'update',
    'upsert',
    'single',
    'head',
  ]) {
    chain[method] = vi.fn(self);
  }

  Object.assign(chain, {
    then: (onFulfilled: (value: SupabaseResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected: (reason: unknown) => unknown) => Promise.resolve(result).catch(onRejected),
  });

  return chain;
}

export function mockSupabaseFrom(
  handlers: Record<string, () => ReturnType<typeof createThenableChain>>,
) {
  return vi.fn((table: string) => {
    const handler = handlers[table];
    if (!handler) {
      throw new Error(`Unexpected supabase.from(${table})`);
    }
    return handler();
  });
}
