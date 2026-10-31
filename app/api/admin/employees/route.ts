import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, getAdminIdentity } from "@/lib/adminAuth";
import { generateStaffPassword, generateStaffUsername, hashPassword } from "@/lib/employeeAuth";
import { createServiceClient, getServiceRoleKey } from "@/lib/supabaseServer";
import { rateLimit } from "@/lib/rateLimit";

/**
 * Employee account management (Master Admin only).
 *
 * POST   → generates username + password, creates a staff account.
 * GET    → lists staff accounts (used as a server-side fallback for the UI).
 * DELETE → revokes a staff account.
 *
 * Hardening vs. the previous version:
 *   - the caller's cookie is *verified* against Supabase Auth, and the role is
 *     read from `app_metadata` (the old check only decoded the JWT and trusted
 *     `user_metadata.role`, which any user can write).
 *   - writes go through the service-role client, so a stolen customer JWT can
 *     never insert into `public.employees`.
 *   - passwords are 96-bit random instead of 48-bit, and are returned exactly
 *     once, over a no-store response.
 *   - the admin sub comes from the verified user, not from an unverified token.
 */

const POSITIONS = ["Manager", "Kitchen", "Driver"] as const;
const PERMISSION_LEVELS = ["full", "orders", "delivery", "viewer"] as const;

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store" } });
}

async function requireAdmin(req: NextRequest) {
  const identity = await getAdminIdentity(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!identity) return { error: noStore({ error: "Unauthorized" }, 401) } as const;
  return { identity } as const;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  if (!getServiceRoleKey()) return noStore({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, username, full_name, contact, position, permission_level, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) return noStore({ error: error.message }, 500);
  return noStore({ employees: data ?? [] });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  // Creating staff accounts is a privileged, auditable action — throttle it.
  const limit = rateLimit(`admin-employees:${auth.identity.user.id}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many account creations. Please slow down." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds), "Cache-Control": "no-store" } }
    );
  }

  if (!getServiceRoleKey()) {
    return noStore({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500);
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const position = typeof body.position === "string" ? body.position : "";
  const permission = typeof body.permission_level === "string" ? body.permission_level : "";
  const fullName = typeof body.full_name === "string" ? body.full_name.trim().slice(0, 120) : null;
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 160) : null;

  if (!(POSITIONS as readonly string[]).includes(position)) {
    return noStore({ error: "Invalid job position." }, 400);
  }
  if (!(PERMISSION_LEVELS as readonly string[]).includes(permission)) {
    return noStore({ error: "Invalid permission level." }, 400);
  }
  // A driver must never get full manager rights.
  if (position === "Driver" && (permission === "full" || permission === "orders")) {
    return noStore({ error: "Drivers can only be granted 'delivery' or 'viewer' permission." }, 400);
  }

  const username = generateStaffUsername(position);
  const password = generateStaffPassword();

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      username,
      password_hash: hashPassword(password),
      full_name: fullName || null,
      contact: contact || null,
      position,
      permission_level: permission,
      is_active: true,
      created_by: auth.identity.user.id,
    })
    .select("id, username, full_name, contact, position, permission_level")
    .single();

  if (error) return noStore({ error: error.message }, 500);

  const origin = new URL(req.url).origin;
  return noStore(
    {
      employee: data,
      password, // shown once in the admin UI; never persisted in plaintext
      login_url: `${origin}/employee/login?emp=${encodeURIComponent(username)}`,
    },
    201
  );
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;
  if (!getServiceRoleKey()) return noStore({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500);

  const { id } = (await req.json().catch(() => ({}))) as { id?: unknown };
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    return noStore({ error: "Employee id required." }, 400);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) return noStore({ error: error.message }, 500);
  return noStore({ success: true });
}
