/**
 * scripts/create-admin.mjs — Create (or reset) the Baduma Master Admin account.
 *
 * Usage:
 *   SUP_URL=https://xxx.supabase.co SUP_ADMIN_KEY=your-admin-api-key \
 *   node scripts/create-admin.mjs hari@baduma.com "your-strong-password"
 *
 *   - email    : the admin login email (any address you control)
 *   - password : optional — omit to auto-generate a strong password
 *                (printed once in the output)
 *
 * Reads SUP_URL / SUP_ADMIN_KEY from the environment or the repo .env file.
 * The ADMIN API key is at https://supabase.com/project/settings/api
 */

import crypto from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';

// --- load .env (repo root) --------------------------------------------------
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith('#') && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
}

const SUP_URL = (process.env.SUP_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
const SUP_ADMIN_KEY = process.env.SUP_ADMIN_KEY ?? process.env.SUP_ANON_KEY ?? '';

if (!SUP_URL || !SUP_ADMIN_KEY) {
  console.error('Missing credentials. Set SUP_URL and SUP_ADMIN_KEY (or put them in .env).');
  console.error('ADMIN API key: https://supabase.com/project/settings/api');
  process.exit(1);
}

const [emailArg, passwordArg] = process.argv.slice(2);

if (!emailArg || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailArg)) {
  console.error('Usage: node scripts/create-admin.mjs <admin-email> [password]');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg && passwordArg.length >= 8
  ? passwordArg
  : crypto.randomBytes(9).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) + 'Aa1!';

// --- helpers ----------------------------------------------------------------
async function api(method, path, body) {
  const res = await fetch(`${SUP_URL}/auth/v1${path}`, {
    method,
    headers: {
      'apikey': SUP_ADMIN_KEY,
      'Authorization': `Bearer ${SUP_ADMIN_KEY}`,
      'Content-Type': 'application/json',
      'x-client-info': 'baduma-create-admin-script',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON error body */ }
  return { status: res.status, json, text };
}

// --- create or update -------------------------------------------------------
let user;
{
  const created = await api('POST', '/admin/users', {
    email,
    password,
    phone: '',
    user_metadata: { role: 'admin', full_name: 'Master Admin' },
  });
  if (created.status === 200 || created.status === 201) {
    user = created.json;
    console.log('\n✅ Master Admin account CREATED.');
  } else {
    // 422 → email already registered → update metadata + password instead.
    const listing = await api('GET', `/admin/users?email=${encodeURIComponent(email)}`);
    const found = listing.json?.find?.((u) => u.email?.toLowerCase() === email);
    if (!found) {
      console.error(`❌ Could not create or find "${email}": ${created.text || created.status}`);
      process.exit(1);
    }
    const updated = await api('PATCH', `/admin/users/${found.id}`, {
      user_metadata: { role: 'admin', full_name: 'Master Admin' },
      password,
    });
    if (updated.status !== 200) {
      console.error(`❌ Update failed: ${updated.text || updated.status}`);
      process.exit(1);
    }
    user = { ...found, ...updated.json, email };
    console.log('\n✅ Master Admin account UPDATED (role + password reset).');
  }
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  LOGIN URL : https://your-app.vercel.app/admin/login`);
console.log(`  EMAIL     : ${email}`);
if (!passwordArg) console.log(`  PASSWORD  : ${password}`);
else console.log(`  PASSWORD  : (the one you provided)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Note: if email confirmation is enabled in your Supabase project,');
console.log('confirm the sent email before the first sign-in.');
