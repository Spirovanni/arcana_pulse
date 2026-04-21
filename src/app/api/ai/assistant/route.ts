import { NextRequest, NextResponse } from "next/server";
import { chat } from "@/lib/services/ai/assistant";
import type { ChatMessage } from "@/lib/services/ai/assistant";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, workspaceId } = body as {
      message?: string;
      history?: ChatMessage[];
      workspaceId?: string;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Validate and trim history
    const validHistory: ChatMessage[] = Array.isArray(history)
      ? history.filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
      : [];
    const trimmedHistory = validHistory.slice(-20);

    const reply = await chat(message.trim(), trimmedHistory, workspaceId);

    return NextResponse.json({ reply });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Assistant request failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
