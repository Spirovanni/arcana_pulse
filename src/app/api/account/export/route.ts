import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { exportUserData } from "@/lib/services/db/auth";
import { isAppwriteConfigured } from "@/lib/appwrite";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAppwriteConfigured()) {
    // In sandbox mode, return a placeholder export
    const placeholder = {
      exportedAt: new Date().toISOString(),
      note: "Appwrite not configured — this is a sandbox export",
      profile: { userId: session.user.userId, email: session.user.email },
      transactions: [],
      banks: [],
      auditLog: [],
    };

    return new NextResponse(JSON.stringify(placeholder, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="arcana-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  const { userId, workspaceId = "ws-001" } = session.user as {
    userId: string;
    workspaceId?: string;
  };

  try {
    const data = await exportUserData(userId, workspaceId);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="arcana-data-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Export failed" },
      { status: 500 }
    );
  }
}
