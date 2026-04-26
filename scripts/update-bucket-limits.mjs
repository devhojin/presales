// Update storage bucket file_size_limit to 1 GB for transfer buckets.
// Read-then-PATCH via Supabase Storage Admin API.

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

const ONE_GB = 1024 * 1024 * 1024; // 1_073_741_824

const TARGETS = [
  { id: 'product-files', limit: ONE_GB },
  { id: 'chat-files', limit: ONE_GB },
  { id: 'consulting-files', limit: ONE_GB },
  { id: 'business-certs', limit: 50 * 1024 * 1024 }, // 50MB 충분
];

async function getBucket(id) {
  const res = await fetch(`${url}/storage/v1/bucket/${id}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  return res.ok ? res.json() : null;
}

async function updateBucket(id, patch) {
  const res = await fetch(`${url}/storage/v1/bucket/${id}`, {
    method: 'PUT',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) return { ok: false, status: res.status, body: await res.text() };
  return { ok: true, body: await res.json() };
}

console.log('--- BEFORE ---');
for (const { id } of TARGETS) {
  const b = await getBucket(id);
  console.log(id, '→', b ? { public: b.public, file_size_limit: b.file_size_limit } : 'NOT FOUND');
}

console.log('\n--- UPDATING ---');
for (const { id, limit } of TARGETS) {
  const cur = await getBucket(id);
  if (!cur) {
    console.log(id, 'skip (not found)');
    continue;
  }
  const patch = {
    public: cur.public,
    file_size_limit: limit,
    allowed_mime_types: cur.allowed_mime_types,
  };
  const r = await updateBucket(id, patch);
  console.log(id, '→', r.ok ? `OK (${limit} bytes)` : `FAIL ${r.status} ${r.body}`);
}

console.log('\n--- AFTER ---');
for (const { id } of TARGETS) {
  const b = await getBucket(id);
  console.log(id, '→', b ? { public: b.public, file_size_limit: b.file_size_limit } : 'NOT FOUND');
}
