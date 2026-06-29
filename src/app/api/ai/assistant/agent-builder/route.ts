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

function buildFallbackConfig(params: {
  companyName: string;
  appName: string;
  agentName: string;
  tone: string;
  goals: string;
  includePostCallWebhook: boolean;
  mustUseEndCall: boolean;
  enableDynamicVariables: boolean;
}): AgentBuilderConfig {
  return {
    name: params.agentName,
    first_message: `Hi, this is ${params.agentName} from ${params.appName}. How can I help you today?`,
    prompt: `# Personality
You are ${params.agentName}, a ${params.tone} assistant for ${params.companyName}.

# Goal
${params.goals}

# Guardrails
- Never fabricate financial data.
- Never claim to execute real-money transfers or autonomous live trading.
- Use concise, clear responses and ask clarifying questions when needed.
${
  params.mustUseEndCall
    ? '- Use the end_call tool when the user says they are done, says goodbye, or requests to end the conversation.'
    : ""
}
`,
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

  const system = `You generate production-ready ElevenLabs Agent JSON configuration.
Return ONLY valid JSON (no markdown, no explanations).
The output MUST include exact top-level keys:
- name
- first_message
- prompt
- tools
- guardrails
- webhook_payload_schema
- dynamic_variable_map

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
- Tailor tools and language for Arcana Pulse use-cases.
- Include end_call in tools.system_tools with clear trigger behavior.
- Include guardrails suitable for finance and AI safety.
- Add webhook_payload_schema with required fields and typed properties.
- dynamic_variable_map must list key, required, description, example.
- Keep first_message natural and short (1 sentence).`;

  const userPrompt = `Generate the JSON configuration now for:
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
    const parsed = parseJsonObject(raw);
    if (!parsed) {
      const fallback = buildFallbackConfig({
        companyName,
        appName,
        agentName,
        tone,
        goals,
        includePostCallWebhook,
        mustUseEndCall,
        enableDynamicVariables,
      });
      return NextResponse.json({
        config: fallback,
        generatedAt: new Date().toISOString(),
        fallbackUsed: true,
      });
    }

    return NextResponse.json({
      config: parsed,
      generatedAt: new Date().toISOString(),
      fallbackUsed: false,
    });
  } catch (error: unknown) {
    const fallback = buildFallbackConfig({
      companyName,
      appName,
      agentName,
      tone,
      goals,
      includePostCallWebhook,
      mustUseEndCall,
      enableDynamicVariables,
    });
    return NextResponse.json(
      {
        config: fallback,
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
