import { getAnthropicClient } from "@/lib/anthropic";
import * as DbTx from "@/lib/services/db/transactions";
import * as DbBanks from "@/lib/services/db/banks";
import * as DbTransfers from "@/lib/services/db/transfers";
import * as MockTx from "@/lib/services/transactions";
import * as MockBanks from "@/lib/services/banks";
import * as MockTransfers from "@/lib/services/transfers";
import { CATEGORY_LABELS } from "@/lib/constants";
import type { Category } from "@/lib/types";
import type Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

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
// Tool definitions
// ---------------------------------------------------------------------------

const ASSISTANT_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "query_transactions",
    description:
      "Search and filter the user's transactions. Use this to find specific transactions or answer questions about spending in a category, date range, or by keyword.",
    input_schema: {
      type: "object" as const,
      properties: {
        date_from: {
          type: "string",
          description: "Start date in ISO format (YYYY-MM-DD)",
        },
        date_to: {
          type: "string",
          description: "End date in ISO format (YYYY-MM-DD)",
        },
        category: {
          type: "string",
          description: `Transaction category. One of: ${Object.keys(CATEGORY_LABELS).join(", ")}`,
        },
        transaction_type: {
          type: "string",
          enum: ["income", "expense", "transfer"],
          description: "Filter by transaction type",
        },
        search: {
          type: "string",
          description: "Keyword search on transaction title",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_account_summary",
    description:
      "Get an overview of the user's financial health: total balance, total income, total expenses, savings rate, and number of linked accounts.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
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
    description:
      "Get month-over-month income and expense totals for trend analysis.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_bank_accounts",
    description:
      "List all linked bank accounts with their institution names, masked account numbers, and current balances.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_recent_transfers",
    description:
      "List recent fund transfers with their amounts, status, recipient info, and dates.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool executor
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
          ...(toolInput.transaction_type ? { transactionType: toolInput.transaction_type as "income" | "expense" | "transfer" } : {}),
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
        const safe = banks.map((b) => ({
          institutionName: b.institutionName,
          displayMask: b.displayMask,
          balance: b.balance,
        }));
        return JSON.stringify(safe);
      }

      case "get_recent_transfers": {
        let transfers: Awaited<ReturnType<typeof DbTransfers.getTransfersByWorkspace>>;
        try {
          transfers = await DbTransfers.getTransfersByWorkspace(workspaceId);
        } catch {
          transfers = MockTransfers.getTransfersByWorkspace(workspaceId);
        }
        const recent = transfers.slice(0, 20).map((t) => ({
          amount: t.amount,
          status: t.status,
          recipientEmail: t.recipientEmail ?? "N/A",
          note: t.note,
          createdAt: t.createdAt,
        }));
        return JSON.stringify(recent);
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
// Main chat function
// ---------------------------------------------------------------------------

export async function chat(
  userMessage: string,
  history: ChatMessage[],
  workspaceId: string
): Promise<string> {
  try {
    const client = getAnthropicClient();

    // Build messages array from history + new user message
    const messages: Anthropic.Messages.MessageParam[] = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    messages.push({ role: "user", content: userMessage });

    // Tool-use loop (max 10 iterations)
    for (let i = 0; i < 10; i++) {
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: ASSISTANT_TOOLS,
        messages,
      });

      // If the model produced a final text response
      if (response.stop_reason === "end_turn") {
        const textBlock = response.content.find((b) => b.type === "text");
        return textBlock && textBlock.type === "text"
          ? textBlock.text
          : "I wasn't able to generate a response. Please try again.";
      }

      // If the model wants to use tools
      if (response.stop_reason === "tool_use") {
        const toolUseBlocks = response.content.filter(
          (b) => b.type === "tool_use"
        );

        if (toolUseBlocks.length === 0) {
          // No tool use blocks found despite tool_use stop reason
          const textBlock = response.content.find((b) => b.type === "text");
          return textBlock && textBlock.type === "text"
            ? textBlock.text
            : "I wasn't able to process that request.";
        }

        // Append the assistant's response (including tool_use blocks)
        messages.push({ role: "assistant", content: response.content });

        // Execute each tool and build tool_result blocks
        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];
        for (const block of toolUseBlocks) {
          if (block.type === "tool_use") {
            const result = await executeTool(
              block.name,
              block.input as Record<string, unknown>,
              workspaceId
            );
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }
        }

        // Append tool results as a user message
        messages.push({ role: "user", content: toolResults });
        continue;
      }

      // Any other stop reason — extract text if available
      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock && textBlock.type === "text") return textBlock.text;
      break;
    }

    return "I'm sorry, I wasn't able to complete your request. Please try rephrasing your question.";
  } catch {
    return "I'm having trouble processing your request right now. Please try again in a moment.";
  }
}
