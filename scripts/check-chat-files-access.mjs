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
console.log('--- anon list chat-files ---');
console.log(await a.storage.from('chat-files').list('', { limit: 1 }));

// Test anon upload (should fail if RLS blocks unauth)
const testBody = new Blob(['hello'], { type: 'text/plain' });
const testName = `_probe_${Date.now()}.txt`;
console.log('--- anon upload probe ---');
console.log(await a.storage.from('chat-files').upload(testName, testBody));

const s = createClient(url, sk);
const { data: objs } = await s.storage.from('chat-files').list('', { limit: 3 });
console.log('--- service list chat-files (first 3) ---');
console.log(objs);
// Cleanup probe
await s.storage.from('chat-files').remove([testName]).catch(() => {});
