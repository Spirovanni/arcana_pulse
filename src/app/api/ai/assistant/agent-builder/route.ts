import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { completeForFeature } from "@/lib/ai-router";

type BuilderRequest = {
  workspaceId?: string;
  companyName?: string;
  appName?: string;
  agentName?: string;
  primaryAudience?: string;
  businessContext?: string;
  goals?: string;
  tone?: string;
  complianceNotes?: string;
  mustUseEndCall?: boolean;
  enableDynamicVariables?: boolean;
  includePostCallWebhook?: boolean;
};

function normalizeText(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function parsePromptTemplate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const requiredHeadings = [
    "# Personality",
    "# Environment",
    "# Tone",
    "# Goal",
    "# When to end the call",
  ];
  if (requiredHeadings.every((heading) => trimmed.includes(heading))) return trimmed;
  return null;
}

function buildFallbackPrompt(params: {
  companyName: string;
  appName: string;
  agentName: string;
  primaryAudience: string;
  businessContext: string;
  tone: string;
  goals: string;
  mustUseEndCall: boolean;
}): string {
  return `# Personality
You are ${params.agentName}, a composed and trustworthy financial advisor for ${params.companyName} inside ${params.appName}. You make complex money topics simple and approachable, and users feel safe with you because you are transparent, never pushy, and always explain the why behind your recommendations.

# Environment
You work as the first point of contact for ${params.primaryAudience}. You support questions about budgeting, spending, cash flow, debt payoff, and educational market intelligence. Business context: ${params.businessContext}

# Tone
- ${params.tone}
- Clear and jargon-light, with concrete examples when useful
- Patient and calm, never rushing users through decisions
- Honest about uncertainty, limits, and missing data
- Empathetic to the emotional impact of financial decisions

# Goal
${params.goals}

# When to end the call
ALWAYS call the end_call tool (don't just say goodbye verbally) when:
- The caller says goodbye in any form ('thanks bye', 'I'm good', 'all set', 'no that's it')
- The caller explicitly asks to end the call
- The caller asks to be removed from contact lists ('don't call again')
${
  params.mustUseEndCall
    ? ""
    : "- The caller confirms all questions are answered and does not need additional help"
}

Briefly acknowledge AND then call end_call. Verbal goodbye alone leaves the call open.`;
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as BuilderRequest;

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
    "Consumers seeking guidance on budgeting, cash flow, and financial planning."
  );
  const businessContext = normalizeText(
    body.businessContext,
    "Digital-first personal finance app with educational market intelligence and paper-trading-only experiences."
  );
  const goals = normalizeText(
    body.goals,
    "Help users understand their finances and leave each conversation with clear, actionable next steps."
  );
  const tone = normalizeText(body.tone, "calm, trustworthy, and concise");
  const complianceNotes = normalizeText(
    body.complianceNotes,
    "No fabricated data. No real-money movement claims. Educational guidance only."
  );
  const mustUseEndCall = body.mustUseEndCall ?? true;
  const enableDynamicVariables = body.enableDynamicVariables ?? true;
  const includePostCallWebhook = body.includePostCallWebhook ?? true;

  const system = `You generate production-ready ElevenLabs voice agent prompt templates.
Return ONLY plain markdown text (no JSON, no code fences, no explanations).
The output MUST include these exact headings in this exact order:
- # Personality
- # Environment
- # Tone
- # Goal
- # When to end the call

Context:
- Product: ${appName}
- Company: ${companyName}
- Audience: ${primaryAudience}
- Business context: ${businessContext}
- Voice tone: ${tone}
- Compliance notes: ${complianceNotes}
- Must include end_call policy: ${mustUseEndCall ? "yes" : "no"}
- Include dynamic variable map: ${enableDynamicVariables ? "yes" : "no"}
- Include post-call webhook blueprint: ${includePostCallWebhook ? "yes" : "no"}

Requirements:
- Tailor the language for Arcana Pulse financial assistant use-cases.
- In #Tone, provide 4-6 bullet points.
- In #When to end the call, explicitly instruct the agent to call end_call tool, not just say goodbye.
- Keep text concise and copy-paste ready for ElevenLabs Agent prompt field.
- Do not output any extra sections beyond the required headings.`;

  const userPrompt = `Generate the markdown prompt template now for:
Agent name: ${agentName}
Primary goal: ${goals}

Suggested Arcana backend routes:
- /api/ai/assistant
- /api/ai/assistant/transcribe
- /api/ai/assistant/voice
- /api/ai/assistant/agent/signed-url
`;

  try {
    const raw = await completeForFeature("agent_builder", system, userPrompt, 1800, {
      workspaceId: auth.workspaceId,
    });
    const parsed = parsePromptTemplate(raw);
    if (!parsed) {
      const fallback = buildFallbackPrompt({
        companyName,
        appName,
        agentName,
        primaryAudience,
        businessContext,
        tone,
        goals,
        mustUseEndCall,
      });
      return NextResponse.json({
        exportText: fallback,
        generatedAt: new Date().toISOString(),
        fallbackUsed: true,
      });
    }

    return NextResponse.json({
      exportText: parsed,
      generatedAt: new Date().toISOString(),
      fallbackUsed: false,
    });
  } catch (error: unknown) {
    const fallback = buildFallbackPrompt({
      companyName,
      appName,
      agentName,
      primaryAudience,
      businessContext,
      tone,
      goals,
      mustUseEndCall,
    });
    return NextResponse.json(
      {
        exportText: fallback,
        generatedAt: new Date().toISOString(),
        fallbackUsed: true,
        error:
          error instanceof Error
            ? error.message
            : "Agent builder generation failed.",
      },
      { status: 200 }
    );
  }
}
