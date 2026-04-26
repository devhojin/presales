// Update products.thumbnail_url to '/thumbnails/product-{id}.png' for every published product
// whose current thumbnail_url is NULL. This matches the PNGs rendered by gen_thumbnail.mjs.

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
if (!url || !serviceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}
const db = createClient(url, serviceKey);

const { data: products, error } = await db
  .from('products')
  .select('id, title, thumbnail_url, is_published')
  .eq('is_published', true)
  .order('id');
if (error) throw error;

const nullRows = products.filter((p) => !p.thumbnail_url);
console.log(`published=${products.length}, null_thumbnail=${nullRows.length}`);

for (const p of nullRows) {
  const target = `/thumbnails/product-${p.id}.png`;
  const { error: updErr } = await db.from('products').update({ thumbnail_url: target }).eq('id', p.id);
  if (updErr) {
    console.error('[fail]', p.id, updErr.message);
    process.exit(1);
  }
  console.log('[set]', p.id, '→', target, `(${p.title})`);
}
console.log('done');
