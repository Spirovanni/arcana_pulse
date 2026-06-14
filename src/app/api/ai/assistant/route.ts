import { NextRequest, NextResponse } from "next/server";
import { chat, ASSISTANT_MODELS } from "@/lib/services/ai/assistant";
import type { ChatMessage, AssistantProvider } from "@/lib/services/ai/assistant";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, workspaceId, model, provider } = body as {
      message?: string;
      history?: ChatMessage[];
      workspaceId?: string;
      model?: string;
      provider?: string;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    // Validate + resolve model/provider from ASSISTANT_MODELS catalogue
    const validHistory: ChatMessage[] = Array.isArray(history)
      ? history.filter(
          (m) =>
            m &&
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string"
        )
      : [];
    const trimmedHistory = validHistory.slice(-20);

    // Resolve the model option; fall back to Claude Haiku if unknown
    const resolvedOption =
      ASSISTANT_MODELS.find((m) => m.id === model) ??
      ASSISTANT_MODELS.find((m) => m.provider === (provider as AssistantProvider)) ??
      ASSISTANT_MODELS[0];

    const reply = await chat(
      message.trim(),
      trimmedHistory,
      workspaceId,
      resolvedOption.id,
      resolvedOption.provider
    );

    return NextResponse.json({ reply, model: resolvedOption.id, provider: resolvedOption.provider });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Assistant request failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Returns the list of available model options for the UI
export async function GET() {
  return NextResponse.json({ models: ASSISTANT_MODELS });
}
