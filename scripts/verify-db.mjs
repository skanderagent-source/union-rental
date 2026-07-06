#!/usr/bin/env node
/**
 * Phase 4 (live): Run Phase 4 schema checks against Supabase.
 */
import { createClient } from '@supabase/supabase-js';
import { backendEnv } from './lib/env.mjs';
import { hasLiveSupabase } from './lib/credentials.mjs';

if (!hasLiveSupabase()) {
  console.error('Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in apps/backend/.env');
  process.exit(1);
}

const env = { ...backendEnv(), ...process.env };
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let failed = 0;

async function checkTables() {
  const required = ['logements', 'demandes_clients', 'agents', 'listing_media', 'geocode_cache'];
  const { data, error } = await admin.rpc('union_rental_schema_tables').select();
  if (error) {
    // rpc may not exist — use direct query via postgrest information_schema workaround
    const { data: listings, error: e2 } = await admin.from('logements').select('id').limit(1);
    if (e2) {
      console.error('✗ Cannot reach logements:', e2.message);
      failed++;
      return;
    }
    for (const table of required) {
      const { error: te } = await admin.from(table).select('*').limit(0);
      if (te && te.code !== 'PGRST116') {
        console.error(`✗ table ${table}: ${te.message}`);
        failed++;
      } else {
        console.log(`✓ table ${table}`);
      }
    }
    return;
  }
  const names = new Set((data ?? []).map((r) => r.table_name));
  for (const table of required) {
    if (!names.has(table)) {
      console.error(`✗ missing table ${table}`);
      failed++;
    } else {
      console.log(`✓ table ${table}`);
    }
  }
}

async function checkView() {
  const { data, error } = await admin.from('public_available_listings').select('id').limit(1);
  if (error) {
    console.error('✗ public_available_listings view:', error.message);
    console.error('  Run db/sql/union_rental_views.sql in Supabase SQL Editor');
    failed++;
  } else {
    console.log('✓ view public_available_listings');
  }
}

async function checkLeadColumns() {
  const { data, error } = await admin.from('demandes_clients').select('logement_id,dossier_tal,ref_agent_id').limit(0);
  if (error) {
    console.error('✗ demandes_clients columns:', error.message);
    failed++;
  } else {
    console.log('✓ demandes_clients has logement_id, dossier_tal, ref_agent_id');
  }
}

async function checkGeocodingColumns() {
  const { data, error } = await admin
    .from('logements')
    .select('latitude,longitude,deleted_at,geocoding_status,geocoded_at,geocoding_error')
    .limit(0);
  if (error) {
    console.error('✗ logements geocoding columns:', error.message);
    console.error('  Run db/sql/0000_fast_rental_dependencies.sql if Fast Rental migrations are missing');
    failed++;
  } else {
    console.log('✓ logements geocoding columns');
  }
}

await checkTables();
await checkView();
await checkLeadColumns();
await checkGeocodingColumns();

if (failed) {
  console.error(`\n${failed} live DB check(s) failed`);
  process.exit(1);
}
console.log('\n✓ Live database verification passed');
