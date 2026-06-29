import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { completeForFeature } from "@/lib/ai-router";

type FirstSentenceRequest = {
  workspaceId?: string;
  companyName?: string;
  appName?: string;
  agentName?: string;
  primaryAudience?: string;
  goals?: string;
  tone?: string;
};

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function sanitizeSentence(value: string): string {
  return value.trim().replace(/^["'`]+|["'`]+$/g, "");
}

function buildFallbackFirstSentence(params: {
  appName: string;
  agentName: string;
  primaryAudience: string;
}): string {
  return `Hi, this is ${params.agentName} from ${params.appName}; I can help with ${params.primaryAudience.toLowerCase()}, so what would you like to work on first?`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as FirstSentenceRequest;

  const auth = await requireAuth(request, {
    requiredRole: "viewer",
    workspaceIdOverride: body.workspaceId,
  });
  if (!auth.ok) return auth.response;

  const companyName = normalizeText(body.companyName, "Arcana Credit Union");
  const appName = normalizeText(body.appName, "Arcana Pulse");
  const agentName = normalizeText(body.agentName, "Arcana Voice Advisor");
  const primaryAudience = normalizeText(
    body.primaryAudience,
    "budgeting, spending, and cash-flow guidance"
  );
  const goals = normalizeText(
    body.goals,
    "help users understand finances and next best actions"
  );
  const tone = normalizeText(body.tone, "calm, trustworthy, concise");

  const system = `You generate one first-message sentence for an ElevenLabs voice agent.
Return ONLY one sentence as plain text (no quotes, no markdown, no bullets).
Rules:
- 14 to 28 words.
- Natural spoken style.
- Mention the agent name and app name.
- Invite the user to begin.
- No compliance disclaimers in this first sentence.`;

  const userPrompt = `Create the first sentence for:
- Company: ${companyName}
- App: ${appName}
- Agent: ${agentName}
- Audience: ${primaryAudience}
- Goal: ${goals}
- Tone: ${tone}`;

  try {
    const raw = await completeForFeature("agent_builder", system, userPrompt, 120, {
      workspaceId: auth.workspaceId,
    });
    const firstSentence = sanitizeSentence(raw);
    if (!firstSentence) {
      return NextResponse.json(
        {
          firstSentence: buildFallbackFirstSentence({
            appName,
            agentName,
            primaryAudience,
          }),
          fallbackUsed: true,
          generatedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }
    return NextResponse.json(
      {
        firstSentence,
        fallbackUsed: false,
        generatedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        firstSentence: buildFallbackFirstSentence({
          appName,
          agentName,
          primaryAudience,
        }),
        fallbackUsed: true,
        generatedAt: new Date().toISOString(),
        error:
          error instanceof Error ? error.message : "Unable to generate first sentence right now.",
      },
      { status: 200 }
    );
  }
}
