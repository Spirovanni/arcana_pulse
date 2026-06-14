import { getAnthropicClient } from "@/lib/anthropic";
import { getOpenAIClient, isOpenAIConfigured } from "@/lib/openai";
import { getGoogleAIClient, isGoogleAIConfigured } from "@/lib/google-ai";
import * as DbTx from "@/lib/services/db/transactions";
import * as DbBanks from "@/lib/services/db/banks";
import * as DbTransfers from "@/lib/services/db/transfers";
import * as MockTx from "@/lib/services/transactions";
import * as MockBanks from "@/lib/services/banks";
import * as MockTransfers from "@/lib/services/transfers";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Category } from "@/lib/types";
import type Anthropic from "@anthropic-ai/sdk";
import type OpenAI from "openai";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type AssistantProvider = "anthropic" | "openai" | "google";

export interface AssistantModelOption {
  id: string;
  provider: AssistantProvider;
  label: string;
  badge: string;
  badgeColor: "purple" | "green" | "blue";
  description: string;
}

export const ASSISTANT_MODELS: AssistantModelOption[] = [
  {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    label: "Claude Haiku",
    badge: "Haiku",
    badgeColor: "purple",
    description: "Fast, efficient responses",
  },
  {
    id: "claude-sonnet-4-6",
    provider: "anthropic",
    label: "Claude Sonnet",
    badge: "Sonnet",
    badgeColor: "purple",
    description: "Deeper reasoning & analysis",
  },
  {
    id: "gpt-4o",
    provider: "openai",
    label: "GPT-4o",
    badge: "GPT-4o",
    badgeColor: "green",
    description: "OpenAI flagship model",
  },
  {
    id: "gpt-4o-mini",
    provider: "openai",
    label: "GPT-4o Mini",
    badge: "4o Mini",
    badgeColor: "green",
    description: "Fast & cost-efficient",
  },
  {
    id: "gemini-1.5-flash",
    provider: "google",
    label: "Gemini Flash",
    badge: "Gemini",
    badgeColor: "blue",
    description: "Google's fast model",
  },
];

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are Arcana, the financial assistant for Arcana Credit Union's Arcana Pulse platform. You help users understand their finances by querying their real transaction, account, and transfer data.

CAPABILITIES:
- Search and filter transactions by date, category, type, or keyword
- Show account balances and financial summaries
- Analyze spending by category
- Show monthly income vs expense trends
- List linked bank accounts
- Show recent fund transfers

RULES:
1. Always use the available tools to look up real data before answering. Never fabricate numbers.
2. Format currency as USD (e.g., $1,234.56).
3. Be concise but helpful. Use bullet points for lists.
4. If asked about something outside your financial analysis scope, politely explain what you can help with.
5. When showing transaction data, summarize rather than listing every field.
6. For date-related questions, infer reasonable date ranges (e.g., "this month" = current calendar month).`;

// ---------------------------------------------------------------------------
// Tool definitions — Anthropic format (used as source of truth)
// ---------------------------------------------------------------------------

const ASSISTANT_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "query_transactions",
    description:
      "Search and filter the user's transactions. Use this to find specific transactions or answer questions about spending in a category, date range, or by keyword.",
    input_schema: {
      type: "object" as const,
      properties: {
        date_from: { type: "string", description: "Start date in ISO format (YYYY-MM-DD)" },
        date_to: { type: "string", description: "End date in ISO format (YYYY-MM-DD)" },
        category: {
          type: "string",
          description: `Transaction category. One of: ${Object.keys(CATEGORY_LABELS).join(", ")}`,
        },
        transaction_type: {
          type: "string",
          enum: ["income", "expense", "transfer"],
          description: "Filter by transaction type",
        },
        search: { type: "string", description: "Keyword search on transaction title" },
        limit: { type: "number", description: "Maximum number of results (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_account_summary",
    description:
      "Get an overview of the user's financial health: total balance, total income, total expenses, savings rate, and number of linked accounts.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_spending_by_category",
    description:
      "Get a breakdown of spending by category with amounts and percentages. Optionally filter to only income or expense categories.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["income", "expense"],
          description: "Filter to income or expense categories only",
        },
      },
      required: [],
    },
  },
  {
    name: "get_monthly_trends",
    description: "Get month-over-month income and expense totals for trend analysis.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_bank_accounts",
    description:
      "List all linked bank accounts with their institution names, masked account numbers, and current balances.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_recent_transfers",
    description:
      "List recent fund transfers with their amounts, status, recipient info, and dates.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
];

// Converted for OpenAI function calling
const OPENAI_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] =
  ASSISTANT_TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));

// ---------------------------------------------------------------------------
// Shared tool executor
// ---------------------------------------------------------------------------

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  workspaceId: string
): Promise<string> {
  try {
    switch (toolName) {
      case "query_transactions": {
        const limit = typeof toolInput.limit === "number" ? toolInput.limit : 20;
        const filter = {
          workspaceId,
          ...(toolInput.date_from ? { dateFrom: toolInput.date_from as string } : {}),
          ...(toolInput.date_to ? { dateTo: toolInput.date_to as string } : {}),
          ...(toolInput.category ? { category: toolInput.category as Category } : {}),
          ...(toolInput.transaction_type
            ? { transactionType: toolInput.transaction_type as "income" | "expense" | "transfer" }
            : {}),
          ...(toolInput.search ? { search: toolInput.search as string } : {}),
        };
        const pageOpts = { page: 1, pageSize: Math.min(limit, 50) };
        let result: Awaited<ReturnType<typeof DbTx.listTransactions>>;
        try {
          result = await DbTx.listTransactions(filter, pageOpts);
        } catch {
          result = MockTx.listTransactions(filter, pageOpts);
        }
        const items = result.items.map((t) => ({
          title: t.title,
          type: t.transactionType,
          category: CATEGORY_LABELS[t.category] || t.category,
          amount: t.amount,
          date: t.date,
          status: t.status,
        }));
        return JSON.stringify({ total: result.total, count: items.length, transactions: items });
      }

      case "get_account_summary": {
        let balance: number, income: number, expense: number, txnValue: number;
        let banks: Awaited<ReturnType<typeof DbBanks.getBanksByWorkspace>>;
        try {
          [balance, income, expense, txnValue, banks] = await Promise.all([
            DbBanks.getTotalBalance(workspaceId),
            DbTx.sumByType(workspaceId, "income"),
            DbTx.sumByType(workspaceId, "expense"),
            DbTx.totalTransactionValue(workspaceId),
            DbBanks.getBanksByWorkspace(workspaceId),
          ]);
        } catch {
          balance = MockBanks.getTotalBalance(workspaceId);
          income = MockTx.sumByType(workspaceId, "income");
          expense = MockTx.sumByType(workspaceId, "expense");
          txnValue = MockTx.totalTransactionValue(workspaceId);
          banks = MockBanks.getBanksByWorkspace(workspaceId);
        }
        const netIncome = income - expense;
        const savingsRate = income > 0 ? (netIncome / income) * 100 : 0;
        return JSON.stringify({
          totalBalance: balance,
          totalIncome: income,
          totalExpense: expense,
          netIncome,
          savingsRate: Math.round(savingsRate * 10) / 10,
          accountCount: banks.length,
          totalTransactionValue: txnValue,
        });
      }

      case "get_spending_by_category": {
        const type = toolInput.type as "income" | "expense" | undefined;
        let breakdown: Awaited<ReturnType<typeof DbTx.getCategoryBreakdown>>;
        try {
          breakdown = await DbTx.getCategoryBreakdown(workspaceId, type);
        } catch {
          breakdown = MockTx.getCategoryBreakdown(workspaceId, type);
        }
        return JSON.stringify(breakdown);
      }

      case "get_monthly_trends": {
        let flow: Awaited<ReturnType<typeof DbTx.getMonthlyFlow>>;
        try {
          flow = await DbTx.getMonthlyFlow(workspaceId);
        } catch {
          flow = MockTx.getMonthlyFlow(workspaceId);
        }
        return JSON.stringify(flow.slice(-12));
      }

      case "get_bank_accounts": {
        let banks: Awaited<ReturnType<typeof DbBanks.getBanksByWorkspace>>;
        try {
          banks = await DbBanks.getBanksByWorkspace(workspaceId);
        } catch {
          banks = MockBanks.getBanksByWorkspace(workspaceId);
        }
        return JSON.stringify(
          banks.map((b) => ({
            institutionName: b.institutionName,
            displayMask: b.displayMask,
            balance: b.balance,
          }))
        );
      }

      case "get_recent_transfers": {
        let transfers: Awaited<ReturnType<typeof DbTransfers.getTransfersByWorkspace>>;
        try {
          transfers = await DbTransfers.getTransfersByWorkspace(workspaceId);
        } catch {
          transfers = MockTransfers.getTransfersByWorkspace(workspaceId);
        }
        return JSON.stringify(
          transfers.slice(0, 20).map((t) => ({
            amount: t.amount,
            status: t.status,
            recipientEmail: t.recipientEmail ?? "N/A",
            note: t.note,
            createdAt: t.createdAt,
          }))
        );
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to fetch data";
    return JSON.stringify({ error: msg });
  }
}

// ---------------------------------------------------------------------------
// Anthropic tool-use loop
// ---------------------------------------------------------------------------

async function chatWithAnthropic(
  userMessage: string,
  history: ChatMessage[],
  workspaceId: string,
  model: string
): Promise<string> {
  const client = getAnthropicClient();

  const messages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  messages.push({ role: "user", content: userMessage });

  for (let i = 0; i < 10; i++) {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: ASSISTANT_TOOLS,
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text");
      return textBlock && textBlock.type === "text"
        ? textBlock.text
        : "I wasn't able to generate a response. Please try again.";
    }

    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      if (toolUseBlocks.length === 0) {
        const textBlock = response.content.find((b) => b.type === "text");
        return textBlock && textBlock.type === "text"
          ? textBlock.text
          : "I wasn't able to process that request.";
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        if (block.type === "tool_use") {
          const result = await executeTool(
            block.name,
            block.input as Record<string, unknown>,
            workspaceId
          );
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
      }
      messages.push({ role: "user", content: toolResults });
      continue;
    }

    const textBlock = response.content.find((b) => b.type === "text");
    if (textBlock && textBlock.type === "text") return textBlock.text;
    break;
  }

  return "I'm sorry, I wasn't able to complete your request. Please try rephrasing your question.";
}

// ---------------------------------------------------------------------------
// OpenAI function-calling loop
// ---------------------------------------------------------------------------

async function chatWithOpenAI(
  userMessage: string,
  history: ChatMessage[],
  workspaceId: string,
  model: string
): Promise<string> {
  const client = getOpenAIClient();

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  for (let i = 0; i < 10; i++) {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      tools: OPENAI_TOOLS,
      messages,
    });

    const choice = response.choices[0];

    if (choice.finish_reason === "stop") {
      return choice.message.content ?? "I wasn't able to generate a response.";
    }

    if (choice.finish_reason === "tool_calls") {
      const toolCalls = choice.message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return choice.message.content ?? "I wasn't able to process that request.";
      }

      messages.push(choice.message);

      for (const tc of toolCalls) {
        // Narrow to standard function tool calls (not custom tool calls)
        if (tc.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        } catch {
          args = {};
        }
        const result = await executeTool(tc.function.name, args, workspaceId);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: result,
        });
      }
      continue;
    }

    if (choice.message.content) return choice.message.content;
    break;
  }

  return "I'm sorry, I wasn't able to complete your request. Please try rephrasing your question.";
}

// ---------------------------------------------------------------------------
// Google — pre-fetched context (no streaming tool-use loop)
// Google's function calling is supported but its schema conversion is verbose;
// instead we pre-fetch a financial snapshot and inject it into the prompt so
// the model can answer most common questions without round-trips.
// ---------------------------------------------------------------------------

async function chatWithGoogle(
  userMessage: string,
  history: ChatMessage[],
  workspaceId: string,
  model: string
): Promise<string> {
  // Pre-fetch financial context to inject into the prompt
  let contextSummary = "";
  try {
    const [balance, income, expense, breakdown, flow, banks] = await Promise.all([
      DbBanks.getTotalBalance(workspaceId).catch(() => MockBanks.getTotalBalance(workspaceId)),
      DbTx.sumByType(workspaceId, "income").catch(() => MockTx.sumByType(workspaceId, "income")),
      DbTx.sumByType(workspaceId, "expense").catch(() => MockTx.sumByType(workspaceId, "expense")),
      DbTx.getCategoryBreakdown(workspaceId, "expense").catch(() =>
        MockTx.getCategoryBreakdown(workspaceId, "expense")
      ),
      DbTx.getMonthlyFlow(workspaceId).catch(() => MockTx.getMonthlyFlow(workspaceId)),
      DbBanks.getBanksByWorkspace(workspaceId).catch(() =>
        MockBanks.getBanksByWorkspace(workspaceId)
      ),
    ]);

    const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    const recentFlow = flow.slice(-3);
    const topCategories = breakdown.slice(0, 5);

    contextSummary = `\n\n<financial_context>
Total Balance: $${balance.toFixed(2)}
Total Income: $${income.toFixed(2)}
Total Expense: $${expense.toFixed(2)}
Savings Rate: ${savingsRate}%
Linked Accounts: ${banks.length}
Top Expense Categories: ${topCategories.map((c) => `${c.label} $${c.amount.toFixed(2)} (${Math.round(c.percentage)}%)`).join(", ")}
Recent Monthly Flow (last 3 months): ${recentFlow.map((m) => `${m.month}: income $${m.income.toFixed(2)}, expense $${m.expense.toFixed(2)}`).join("; ")}
</financial_context>`;
  } catch {
    contextSummary = "\n\n<financial_context>Financial data unavailable at this time.</financial_context>";
  }

  const client = getGoogleAIClient();
  const genModel = client.getGenerativeModel({ model });

  const systemWithContext = SYSTEM_PROMPT + contextSummary +
    "\n\nNote: The financial context above contains pre-fetched data from the user's account. Answer based on this data. If the user asks for something not covered, say you have limited information available and they can try a different model.";

  const googleHistory = history.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = genModel.startChat({ history: googleHistory });

  const lastHistory = history.length > 0 ? history[history.length - 1] : null;
  const prompt = lastHistory?.role === "user"
    ? `${systemWithContext}\n\n${lastHistory.content}\n\nUser: ${userMessage}`
    : `${systemWithContext}\n\nUser: ${userMessage}`;

  const result = await chat.sendMessage(prompt);
  return result.response.text();
}

// ---------------------------------------------------------------------------
// Public API — unified chat entry point
// ---------------------------------------------------------------------------

export async function chat(
  userMessage: string,
  history: ChatMessage[],
  workspaceId: string,
  model: string = "claude-haiku-4-5-20251001",
  provider: AssistantProvider = "anthropic"
): Promise<string> {
  try {
    switch (provider) {
      case "anthropic":
        return await chatWithAnthropic(userMessage, history, workspaceId, model);

      case "openai":
        if (!isOpenAIConfigured()) {
          return "OpenAI is not configured on this server. Please use Claude or Gemini, or contact your administrator.";
        }
        return await chatWithOpenAI(userMessage, history, workspaceId, model);

      case "google":
        if (!isGoogleAIConfigured()) {
          return "Google AI is not configured on this server. Please use Claude or GPT-4o, or contact your administrator.";
        }
        return await chatWithGoogle(userMessage, history, workspaceId, model);

      default:
        return await chatWithAnthropic(userMessage, history, workspaceId, "claude-haiku-4-5-20251001");
    }
  } catch {
    return "I'm having trouble processing your request right now. Please try again in a moment.";
  }
}
