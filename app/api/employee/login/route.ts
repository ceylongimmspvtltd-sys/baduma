import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EMPLOYEE_COOKIE, signEmployeeToken, verifyPassword } from '@/lib/employeeAuth';

/**
 * Employee sign-in (username + password, verified against Supabase RPC).
 * Issues an HMAC-signed httpOnly `employee_session` cookie.
 */

const REDIRECTS: Record<string, string> = {
  Manager: '/pos',
  Kitchen: '/',
  Driver: '/driver',
};

export async function POST(req: NextRequest) {
  const { username, password } = await req.json().catch(() => ({}));

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Username and password required.' }, { status: 400 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: 'Supabase environment variables are not configured.' },
      { status: 500 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data, error } = await supabase.rpc('get_employee_by_username', {
    p_username: username.trim(),
  });
  if (error) {
    return NextResponse.json({ error: 'Sign-in service unavailable.' }, { status: 500 });
  }

  const employee = (data as Array<Record<string, unknown>> | null)?.[0];
  if (!employee || !employee.is_active || !verifyPassword(password, String(employee.password_hash))) {
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  const token = signEmployeeToken({
    sub: String(employee.id),
    username: String(employee.username),
    position: String(employee.position),
    permission_level: String(employee.permission_level),
  });

  const res = NextResponse.json({
    success: true,
    redirect: REDIRECTS[String(employee.position)] || '/',
  });
  res.cookies.set(EMPLOYEE_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
