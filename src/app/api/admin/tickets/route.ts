import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/auth/withAdmin";
import { listSupportTickets, updateTicketStatus } from "@/lib/services/db/admin";
import type { SupportTicket } from "@/lib/types";

export async function GET(request: NextRequest) {
  const admin = await requirePlatformAdmin(request);
  if (!admin.ok) return admin.response;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") as SupportTicket["status"] | null;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  try {
    const result = await listSupportTickets(status ?? undefined, limit);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load tickets";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

const UpdateTicketSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

export async function PATCH(request: NextRequest) {
  const admin = await requirePlatformAdmin(request);
  if (!admin.ok) return admin.response;

  const body = await request.json().catch(() => ({}));
  const parsed = UpdateTicketSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await updateTicketStatus(parsed.data.ticketId, parsed.data.status);
    if (!updated) {
      return NextResponse.json({ error: "Ticket not found or update failed" }, { status: 404 });
    }
    return NextResponse.json({ ticket: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update ticket";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
