import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const fetchWithTimeout: typeof fetch = (input, init) => {
  const signal = init?.signal ?? AbortSignal.timeout(env.DB_QUERY_TIMEOUT_MS);
  return fetch(input, { ...init, signal });
};

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  global: { fetch: fetchWithTimeout },
});
