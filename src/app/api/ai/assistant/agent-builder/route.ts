import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/withAuth";
import { completeForFeature } from "@/lib/ai-router";

type BuilderRequest = {
  exportMode?: "prompt" | "json";
  workspaceId?: string;
  firstSentence?: string;
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

type AgentBuilderConfig = {
  name: string;
  first_message: string;
  prompt: string;
  tools: {
    system_tools: Array<{
      name: string;
      description?: string;
    }>;
    webhook_tools: Array<{
      name: string;
      description: string;
      method: "POST";
      url: string;
      headers?: Record<string, string>;
      body_template?: Record<string, unknown>;
    }>;
  };
  guardrails: {
    focus_guardrail: boolean;
    custom_guardrails: Array<{
      name: string;
      action: "retry" | "block";
      instruction: string;
    }>;
  };
  webhook_payload_schema: {
    type: "object";
    required: string[];
    properties: Record<string, unknown>;
  };
  dynamic_variable_map: Array<{
    key: string;
    required: boolean;
    description: string;
    example: string;
  }>;
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

function parseJsonObject(input: string): Record<string, unknown> | null {
  const trimmed = input.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
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

function buildFallbackJson(params: {
  companyName: string;
  appName: string;
  agentName: string;
  firstSentence: string | null;
  tone: string;
  goals: string;
  includePostCallWebhook: boolean;
  mustUseEndCall: boolean;
  enableDynamicVariables: boolean;
}): AgentBuilderConfig {
  return {
    name: params.agentName,
    first_message:
      params.firstSentence ??
      `Hi, this is ${params.agentName} from ${params.appName}. How can I help you today?`,
    prompt: buildFallbackPrompt({
      companyName: params.companyName,
      appName: params.appName,
      agentName: params.agentName,
      primaryAudience:
        "Consumers seeking guidance on budgeting, cash flow, and financial planning.",
      businessContext:
        "Digital-first personal finance app with educational market intelligence and paper-trading-only experiences.",
      tone: params.tone,
      goals: params.goals,
      mustUseEndCall: params.mustUseEndCall,
    }),
    tools: {
      system_tools: [
        {
          name: "end_call",
          description:
            "End the conversation only when the user confirms they are done or explicitly asks to end.",
        },
      ],
      webhook_tools: params.includePostCallWebhook
        ? [
            {
              name: "post_call_sync",
              description:
                "Send call summary, transcript metadata, and user context to Arcana backend for analytics and follow-up.",
              method: "POST",
              url: "https://www.arcanapulse.ai/api/ai/assistant/post-call",
              headers: {
                "Content-Type": "application/json",
                "X-Agent-Source": "elevenlabs",
              },
              body_template: {
                workspaceId: "{{workspace_id}}",
                userId: "{{user_id}}",
                conversationId: "{{conversation_id}}",
                transcript: "{{system__conversation_history}}",
                endedAt: "{{ended_at}}",
              },
            },
          ]
        : [],
    },
    guardrails: {
      focus_guardrail: true,
      custom_guardrails: [
        {
          name: "No fabricated financial data",
          action: "retry",
          instruction: "Only use verified data from tools or user-provided inputs.",
        },
        {
          name: "No live money movement claims",
          action: "block",
          instruction:
            "Never claim to execute real-money transfers, live trading, or irreversible financial actions.",
        },
      ],
    },
    webhook_payload_schema: {
      type: "object",
      required: ["workspaceId", "userId", "conversationId", "transcript", "endedAt"],
      properties: {
        workspaceId: { type: "string" },
        userId: { type: "string" },
        conversationId: { type: "string" },
        transcript: { type: "string" },
        endedAt: { type: "string", format: "date-time" },
      },
    },
    dynamic_variable_map: params.enableDynamicVariables
      ? [
          {
            key: "first_name",
            required: false,
            description: "User's preferred first name",
            example: "Xavier",
          },
          {
            key: "workspace_name",
            required: true,
            description: "Current workspace label",
            example: "Arcana Main Workspace",
          },
          {
            key: "membership_tier",
            required: false,
            description: "User subscription level",
            example: "pro",
          },
        ]
      : [],
  };
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as BuilderRequest;
  const exportMode = body.exportMode === "json" ? "json" : "prompt";

  const auth = await requireAuth(request, {
    requiredRole: "viewer",
    workspaceIdOverride: body.workspaceId,
  });
  if (!auth.ok) return auth.response;

  const companyName = normalizeText(body.companyName, "Arcana Credit Union");
  const appName = normalizeText(body.appName, "Arcana Pulse");
  const agentName = normalizeText(body.agentName, "Arcana Voice Advisor");
  const firstSentence =
    typeof body.firstSentence === "string" && body.firstSentence.trim().length > 0
      ? body.firstSentence.trim()
      : null;
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

  const contextBlock = `Context:
- Product: ${appName}
- Company: ${companyName}
- Audience: ${primaryAudience}
- Business context: ${businessContext}
- Voice tone: ${tone}
- Compliance notes: ${complianceNotes}
- Must include end_call policy: ${mustUseEndCall ? "yes" : "no"}
- Include dynamic variable map: ${enableDynamicVariables ? "yes" : "no"}
- Include post-call webhook blueprint: ${includePostCallWebhook ? "yes" : "no"}
${firstSentence ? `- Preferred first sentence: ${firstSentence}` : ""}`;

  const userPrompt = `Generate the ${exportMode === "json" ? "JSON configuration" : "markdown prompt template"} now for:
Agent name: ${agentName}
Primary goal: ${goals}

Suggested Arcana backend routes:
- /api/ai/assistant
- /api/ai/assistant/transcribe
- /api/ai/assistant/voice
- /api/ai/assistant/agent/signed-url
`;

  try {
    const system =
      exportMode === "json"
        ? `You generate production-ready ElevenLabs Agent JSON configuration.
Return ONLY valid JSON (no markdown, no explanations).
The output MUST include exact top-level keys:
- name
- first_message
- prompt
- tools
- guardrails
- webhook_payload_schema
- dynamic_variable_map

${contextBlock}

Requirements:
- Tailor tools and language for Arcana Pulse use-cases.
- Include end_call in tools.system_tools with clear trigger behavior.
- Include guardrails suitable for finance and AI safety.
- Add webhook_payload_schema with required fields and typed properties.
- dynamic_variable_map must list key, required, description, example.
- Keep first_message natural and short (1 sentence).`
        : `You generate production-ready ElevenLabs voice agent prompt templates.
Return ONLY plain markdown text (no JSON, no code fences, no explanations).
The output MUST include these exact headings in this exact order:
- # Personality
- # Environment
- # Tone
- # Goal
- # When to end the call

${contextBlock}

Requirements:
- Tailor the language for Arcana Pulse financial assistant use-cases.
- In #Tone, provide 4-6 bullet points.
- In #When to end the call, explicitly instruct the agent to call end_call tool, not just say goodbye.
- Keep text concise and copy-paste ready for ElevenLabs Agent prompt field.
- Do not output any extra sections beyond the required headings.`;

    const raw = await completeForFeature("agent_builder", system, userPrompt, 1800, {
      workspaceId: auth.workspaceId,
    });

    if (exportMode === "json") {
      const parsedJson = parseJsonObject(raw);
      if (!parsedJson) {
        const fallbackJson = buildFallbackJson({
          companyName,
          appName,
          agentName,
          firstSentence,
          tone,
          goals,
          includePostCallWebhook,
          mustUseEndCall,
          enableDynamicVariables,
        });
        return NextResponse.json({
          exportMode,
          exportJson: fallbackJson,
          generatedAt: new Date().toISOString(),
          fallbackUsed: true,
        });
      }
      return NextResponse.json({
        exportMode,
        exportJson: parsedJson,
        generatedAt: new Date().toISOString(),
        fallbackUsed: false,
      });
    }

    const parsedPrompt = parsePromptTemplate(raw);
    if (!parsedPrompt) {
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
        exportMode,
        exportText: fallback,
        generatedAt: new Date().toISOString(),
        fallbackUsed: true,
      });
    }

    return NextResponse.json({
      exportMode,
      exportText: parsedPrompt,
      generatedAt: new Date().toISOString(),
      fallbackUsed: false,
    });
  } catch (error: unknown) {
    const fallbackPrompt = buildFallbackPrompt({
      companyName,
      appName,
      agentName,
      primaryAudience,
      businessContext,
      tone,
      goals,
      mustUseEndCall,
    });
    const fallbackJson = buildFallbackJson({
      companyName,
      appName,
      agentName,
      firstSentence,
      tone,
      goals,
      includePostCallWebhook,
      mustUseEndCall,
      enableDynamicVariables,
    });
    return NextResponse.json(
      {
        exportMode,
        ...(exportMode === "json"
          ? { exportJson: fallbackJson }
          : { exportText: fallbackPrompt }),
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
