import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { ADMIN_COOKIE, decodeJwtPayload, isAdminToken } from '@/lib/adminAuth';
import { hashPassword } from '@/lib/employeeAuth';

/**
 * Employee account management (Master Admin only).
 * POST   -> generates username + password, creates an employee account.
 * DELETE -> removes an employee account.
 */

const POSITIONS = ['Manager', 'Kitchen', 'Driver'];
const PERMISSION_LEVELS = ['full', 'orders', 'delivery', 'viewer'];

function requireSupabaseEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: 'Supabase environment variables are not configured.' },
      { status: 500 }
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envError = requireSupabaseEnv();
  if (envError) return envError;

  const { position, permission_level, full_name, contact } = await req.json().catch(() => ({}));
  if (!POSITIONS.includes(position)) {
    return NextResponse.json({ error: 'Invalid job position.' }, { status: 400 });
  }
  if (!PERMISSION_LEVELS.includes(permission_level)) {
    return NextResponse.json({ error: 'Invalid permission level.' }, { status: 400 });
  }

  const username = `${position.toLowerCase().slice(0, 3)}${randomBytes(3).toString('hex')}`;
  const password = randomBytes(6).toString('base64url').slice(0, 12);
  const adminSub = decodeJwtPayload(token)?.sub;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data, error } = await supabase
    .from('employees')
    .insert({
      username,
      password_hash: hashPassword(password),
      full_name: typeof full_name === 'string' ? full_name.trim() : null,
      contact: typeof contact === 'string' ? contact.trim() : null,
      position,
      permission_level,
      is_active: true,
      created_by: adminSub,
    })
    .select('id, username, full_name, contact, position, permission_level')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  return NextResponse.json(
    {
      employee: data,
      password,
      login_url: `${origin}/employee/login?emp=${username}`,
    },
    { status: 201 }
  );
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const envError = requireSupabaseEnv();
  if (envError) return envError;

  const { id } = await req.json().catch(() => ({}));
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Employee id required.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { error } = await supabase.from('employees').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
