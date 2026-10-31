import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ADMIN_COOKIE, isAdminToken } from "@/lib/adminAuth";

/**
 * Supabase Storage endpoint for product images.
 * POST   -> uploads an image to the `product-images` bucket (admin-only).
 * DELETE -> removes an image by storage path (admin-only).
 */

const BUCKET = "product-images";

function getAdminClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

function requireSupabaseEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { error: "Supabase environment variables are not configured." },
      { status: 500 }
    );
  }
  return null;
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const envError = requireSupabaseEnv();
  if (envError) return envError;

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const objectPath = `${crypto.randomUUID()}.${ext}`;

  const supabase = getAdminClient(token!);
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return NextResponse.json({ url: data.publicUrl, path: objectPath });
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (!isAdminToken(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const envError = requireSupabaseEnv();
  if (envError) return envError;

  const { path } = await req.json().catch(() => ({ path: null }));
  if (!path || typeof path !== "string") {
    return NextResponse.json({ error: "Path required." }, { status: 400 });
  }

  const supabase = getAdminClient(token!);
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
