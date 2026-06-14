/**
 * POST /api/banks/statements/save-file
 *
 * Saves an uploaded file (CSV or PDF) to public/statements/{username}/
 * without parsing or importing it. Used by UploadBankModal for the
 * two-step flow: save → build-from-statement.
 *
 * Body: multipart/form-data
 *   file     — the file to save
 *   username — subfolder under public/statements/
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import fs from "fs";
import path from "path";

const STATEMENTS_ROOT = path.join(process.cwd(), "public", "statements");
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const rawUsername = (formData.get("username") as string | null) ??
    auth.session.user.email.split("@")[0];

  if (!file) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File exceeds the 25 MB limit" }, { status: 413 });
  }

  const allowed = /\.(csv|txt|pdf)$/i;
  if (!allowed.test(file.name)) {
    return NextResponse.json({ error: "Only .csv, .txt, and .pdf files are accepted" }, { status: 415 });
  }

  const username = rawUsername.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 64);
  const dir = path.join(STATEMENTS_ROOT, username);
  fs.mkdirSync(dir, { recursive: true });

  const safeName = path.basename(file.name).replace(/[^a-zA-Z0-9_\-. ]/g, "_");
  const dest = path.join(dir, safeName);

  // Prevent path traversal
  if (!dest.startsWith(STATEMENTS_ROOT)) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buffer);

  return NextResponse.json({
    saved: true,
    filename: safeName,
    username,
    path: `/statements/${username}/${safeName}`,
    sizeBytes: buffer.length,
  });
}
