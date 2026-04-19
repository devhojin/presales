import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
const env = {};
const c = fs.readFileSync('./.env.production.local', 'utf8');
for (const l of c.split('\n')) {
  const t = l.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i === -1) continue;
  let v = t.slice(i + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  env[t.slice(0, i).trim()] = v.replace(/\\n$/, '');
}
const url = env['NEXT_PUBLIC_SUPABASE_URL'];
const sk = env['SUPABASE_SERVICE_ROLE_KEY'];
const anon = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ?? env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

const a = createClient(url, anon);
const testBody = new Blob(['hello'], { type: 'text/plain' });
const testName = `_probe_${Date.now()}.txt`;
console.log('--- anon upload consulting-files ---');
console.log(await a.storage.from('consulting-files').upload(testName, testBody));
const s = createClient(url, sk);
await s.storage.from('consulting-files').remove([testName]).catch(() => {});
