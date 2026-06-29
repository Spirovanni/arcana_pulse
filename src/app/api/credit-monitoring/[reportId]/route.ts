import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import {
  getCreditReport,
  updateCreditReport,
} from "@/lib/services/db/creditMonitoring";
import type { CreditReminder, CreditTimelineEntry } from "@/lib/types";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  const auth = await requireAuth(request, { requiredRole: "member" });
  if (!auth.ok) return auth.response;

  const { reportId } = await context.params;
  const report = await getCreditReport(reportId);
  if (
    !report ||
    report.workspaceId !== auth.workspaceId ||
    report.userId !== auth.session.user.userId
  ) {
    return NextResponse.json({ error: "Credit report not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({} as {
    action?: "add_timeline" | "add_reminder" | "toggle_reminder" | "archive" | "update_scores";
    score?: number;
    note?: string;
    title?: string;
    dueDate?: string;
    reminderId?: string;
    completed?: boolean;
    currentScore?: number | null;
    targetScore?: number | null;
  }));

  try {
    switch (body.action) {
      case "add_timeline": {
        if (typeof body.score !== "number") {
          return NextResponse.json({ error: "score is required" }, { status: 400 });
        }
        const entry: CreditTimelineEntry = {
          entryId: makeId("ctl"),
          recordedAt: new Date().toISOString(),
          score: body.score,
          note: body.note?.slice(0, 500),
        };
        const updated = await updateCreditReport(reportId, {
          timeline: [...report.timeline, entry],
          currentScore: body.score,
        });
        return NextResponse.json({ report: updated });
      }
      case "add_reminder": {
        if (!body.title || !body.dueDate) {
          return NextResponse.json(
            { error: "title and dueDate are required" },
            { status: 400 }
          );
        }
        const reminder: CreditReminder = {
          reminderId: makeId("crm"),
          title: body.title.slice(0, 140),
          dueDate: body.dueDate,
          completed: false,
          notes: body.note?.slice(0, 500),
          createdAt: new Date().toISOString(),
        };
        const updated = await updateCreditReport(reportId, {
          reminders: [...report.reminders, reminder],
        });
        return NextResponse.json({ report: updated });
      }
      case "toggle_reminder": {
        if (!body.reminderId || typeof body.completed !== "boolean") {
          return NextResponse.json(
            { error: "reminderId and completed are required" },
            { status: 400 }
          );
        }
        const reminders = report.reminders.map((reminder) =>
          reminder.reminderId === body.reminderId
            ? { ...reminder, completed: body.completed }
            : reminder
        );
        const updated = await updateCreditReport(reportId, { reminders });
        return NextResponse.json({ report: updated });
      }
      case "archive": {
        const updated = await updateCreditReport(reportId, { status: "archived" });
        return NextResponse.json({ report: updated });
      }
      case "update_scores": {
        const updated = await updateCreditReport(reportId, {
          currentScore:
            typeof body.currentScore === "number" ? body.currentScore : undefined,
          targetScore:
            typeof body.targetScore === "number" ? body.targetScore : undefined,
        });
        return NextResponse.json({ report: updated });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
