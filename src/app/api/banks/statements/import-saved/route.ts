/**
 * POST /api/banks/statements/import-saved
 *
 * Imports a saved statement file from /public/statements/{username}/{filename}
 * Body: { username: string; filename: string; bankId: string; workspaceId?: string }
 *
 * GET /api/banks/statements/import-saved?username=xavier_martinez
 * Lists all statement files available for that user.
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { parseStatement } from "@/lib/services/statementParser";
import { insertSyncedTransaction } from "@/lib/services/transactions";
import { getBankById } from "@/lib/services/banks";
import fs from "fs";
import path from "path";
import type { Category } from "@/lib/types";

const STATEMENTS_ROOT = path.join(process.cwd(), "public", "statements");

function statementsDir(username: string): string {
  return path.join(STATEMENTS_ROOT, username);
}

function safeUsername(raw: string): string {
  // Strip any path traversal attempts
  return raw.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 64);
}

// ── GET — list saved statements for a user ────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const username = safeUsername(
    request.nextUrl.searchParams.get("username") ?? ""
  );
  if (!username) {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const dir = statementsDir(username);
  if (!fs.existsSync(dir)) {
    return NextResponse.json({ files: [] });
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(csv|txt|pdf)$/i.test(f))
    .map((filename) => {
      const stat = fs.statSync(path.join(dir, filename));
      return {
        filename,
        username,
        sizeBytes: stat.size,
        uploadedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

  return NextResponse.json({ files });
}

// ── POST — import a saved statement ──────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as {
    username?: string;
    filename?: string;
    bankId?: string;
    workspaceId?: string;
  };

  const { filename, bankId } = body;
  const username = safeUsername(body.username ?? "");
  const workspaceId = body.workspaceId ?? auth.workspaceId;

  if (!username || !filename || !bankId) {
    return NextResponse.json(
      { error: "username, filename, and bankId are required" },
      { status: 400 }
    );
  }

  // Validate bank ownership
  const bank = getBankById(bankId);
  if (!bank || bank.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Bank not found" }, { status: 404 });
  }

  // Resolve file path — prevent traversal
  const safeFile = path.basename(filename);
  const filePath = path.join(statementsDir(username), safeFile);

  if (!filePath.startsWith(STATEMENTS_ROOT)) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { error: `File not found: ${safeFile}` },
      { status: 404 }
    );
  }

  const content = fs.readFileSync(filePath, "utf-8");
  if (!content.trim()) {
    return NextResponse.json({ error: "File is empty" }, { status: 422 });
  }

  // Parse and import
  const result = parseStatement(content, safeFile);

  const seen = new Set<string>();
  let imported = 0;
  let duplicates = 0;

  for (const txn of result.transactions) {
    if (seen.has(txn.externalReference)) { duplicates++; continue; }
    seen.add(txn.externalReference);

    const syncType: "income" | "expense" =
      txn.transactionType === "income" ? "income" : "expense";

    insertSyncedTransaction({
      workspaceId,
      bankId,
      title: txn.title,
      amount: txn.amount,
      transactionType: syncType,
      category: txn.category as Category,
      date: txn.date,
      externalReference: txn.externalReference,
    });
    imported++;
  }

  return NextResponse.json({
    imported,
    duplicates,
    skipped: result.skipped,
    total: result.transactions.length,
    format: result.format,
    filename: safeFile,
    bankName: bank.institutionName,
    message: `Imported ${imported} transaction${imported !== 1 ? "s" : ""} from ${safeFile}.${duplicates > 0 ? ` ${duplicates} duplicate${duplicates !== 1 ? "s" : ""} skipped.` : ""}`,
  });
}
