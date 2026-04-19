// Read-only diagnostics: storage buckets, orders CHECK constraint, download_logs policies,
// duplicate pending orders. Does NOT mutate anything.

import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.production.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  let v = t.slice(i + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  v = v.replace(/\\n$/, '');
  env[t.slice(0, i).trim()] = v;
}

const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceKey = env['SUPABASE_SERVICE_ROLE_KEY'] ?? env['SUPABASE_SECRET_KEY'];
const db = createClient(url, serviceKey);

async function q(sql) {
  const { data, error } = await db.rpc('execute_raw_sql', { sql }).catch(() => ({ data: null, error: null }));
  if (data) return data;
  // fallback: direct REST query via PostgREST if no RPC
  return null;
}

// Buckets via Admin API (REST)
console.log('--- buckets ---');
const restUrl = `${url}/storage/v1/bucket`;
const bRes = await fetch(restUrl, {
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
});
if (!bRes.ok) console.log('err:', bRes.status, await bRes.text());
else {
  const list = await bRes.json();
  console.table(list.map((b) => ({ id: b.id, name: b.name, public: b.public, size_limit: b.file_size_limit })));
}

// Observed orders.status values
{
  const { data: rows, error: re } = await db.from('orders').select('status').limit(2000);
  if (re) console.log('orders sample err:', re.message);
  else {
    const set = new Set(rows.map((r) => r.status));
    console.log('--- distinct orders.status observed ---');
    console.log([...set]);
  }
}

// download_logs policies — direct pg_policies query via supabase sql
console.log('--- pg_policies for download_logs ---');
const sqlUrl = `${url}/rest/v1/rpc/`;
// fallback: use postgres meta via PostgREST is not available. Use direct pg query via built-in `/rest/v1/` — we lack RPC for raw SQL.
// Just compare anon/authenticated/service visibility.
const anonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];
const anon = createClient(url, anonKey);
const { data: anonRows, error: anonErr } = await anon.from('download_logs').select('id, user_id').limit(10);
console.log('anon select download_logs:', anonErr ? `err=${anonErr.message}` : `rows=${anonRows.length}`);
const { data: svcRows, error: svcErr } = await db.from('download_logs').select('id, user_id, user_name, product_id').limit(5);
console.log('service select download_logs (first 5):', svcErr ? `err=${svcErr.message}` : svcRows);
console.log('--- total log count ---');
const { count: totalLogs } = await db.from('download_logs').select('*', { count: 'exact', head: true });
console.log('total download_logs rows:', totalLogs);

// Duplicate pending orders per user
const { data: dupes, error: de } = await db
  .from('orders')
  .select('user_id, status')
  .eq('status', 'pending');
if (de) console.log('pending err:', de.message);
else {
  const byUser = {};
  for (const r of dupes) byUser[r.user_id] = (byUser[r.user_id] ?? 0) + 1;
  const users = Object.entries(byUser).filter(([, n]) => n > 1);
  console.log('--- pending orders: users with >1 pending ---');
  console.log(users.length ? users : 'none');
  console.log('total pending rows:', dupes.length);
}

// order_items columns probe (check new cols)
const { data: oiProbe, error: oiErr } = await db
  .from('order_items')
  .select('id, original_price, discount_amount, discount_reason, discount_source_product_id')
  .limit(1);
console.log('--- order_items new cols probe ---');
console.log(oiErr ? `ERR: ${oiErr.message}` : `OK rows=${oiProbe.length}`);

// Check status values actually allowed — attempt a dry insert then rollback-like approach
// Instead, just check if any rows already have 'pending_transfer'
const { data: ptCheck } = await db.from('orders').select('id').eq('status', 'pending_transfer').limit(1);
console.log('pending_transfer rows exist?', ptCheck ? ptCheck.length : '?');
