import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ADMIN_COOKIE, getAdminIdentity } from "@/lib/adminAuth";
import { createServiceClient, getServiceRoleKey } from "@/lib/supabaseServer";

/**
 * Supabase Storage endpoint for product images.
 * POST   → uploads an image to the `product-images` bucket (admin-only).
 * DELETE → removes an image by storage path (admin-only).
 *
 * Hardening vs. the previous version:
 *   - the cookie is verified with Supabase Auth and the role comes from
 *     `app_metadata`, so a forged/decoded-only JWT cannot upload.
 *   - MIME allowlist + 5 MB cap: previously any file (including .html/.svg)
 *     could be pushed into a public bucket → stored XSS on the CDN domain.
 *   - the object path is fully server-generated; user filenames are never used.
 *   - the path is validated before deletion so admins cannot delete arbitrary
 *     objects (e.g. `../` traversal or another bucket's key).
 */

const BUCKET = "product-images";
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

function noStore(json: unknown, status = 200) {
  return NextResponse.json(json, { status, headers: { "Cache-Control": "no-store" } });
}

async function requireAdmin(req: NextRequest) {
  const identity = await getAdminIdentity(req.cookies.get(ADMIN_COOKIE)?.value);
  if (!identity) return { error: noStore({ error: "Unauthorized" }, 401) } as const;
  if (!getServiceRoleKey()) {
    return { error: noStore({ error: "Server is missing SUPABASE_SERVICE_ROLE_KEY." }, 500) } as const;
  }
  return { identity } as const;
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return noStore({ error: "Expected multipart/form-data." }, 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return noStore({ error: "No file provided." }, 400);
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return noStore({ error: "Image must be between 1 byte and 5 MB." }, 413);
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return noStore({ error: "Unsupported image type. Use JPEG, PNG, WebP, AVIF or GIF." }, 415);
  }

  // Verify the magic bytes as well — the Content-Type header is client supplied.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!looksLikeImage(head)) {
    return noStore({ error: "File content does not look like an image." }, 415);
  }

  const objectPath = `${randomUUID()}.${ext}`;
  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, await file.arrayBuffer(), {
    contentType: file.type,
    upsert: false,
    cacheControl: "31536000",
  });

  if (error) return noStore({ error: error.message }, 500);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return noStore({ url: data.publicUrl, path: objectPath });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  const { path } = (await req.json().catch(() => ({ path: null }))) as { path?: unknown };
  if (typeof path !== "string" || !/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif|gif)$/i.test(path)) {
    return noStore({ error: "Invalid object path." }, 400);
  }

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) return noStore({ error: error.message }, 500);

  return noStore({ success: true });
}

/** Minimal magic-byte sniffing for the formats we allow. */
function looksLikeImage(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return true;
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return true;
  // WebP / AVIF: RIFF....WEBP  or  ....ftypavif
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return true;
  }
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    return true; // ISO-BMFF container (AVIF/HEIF)
  }
  return false;
}
