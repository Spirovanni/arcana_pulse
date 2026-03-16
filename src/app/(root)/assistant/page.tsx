"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, User } from "lucide-react";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  "How much did I spend on food this month?",
  "What are my biggest expense categories?",
  "Show me my monthly income vs expenses trend",
  "What is my current savings rate?",
  "List my linked bank accounts and balances",
  "What are my most recent transfers?",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;

      const userMsg: Message = {
        id: `msg-${Date.now()}-user`,
        role: "user",
        content: text.trim(),
      };

      // Build history from current messages (before adding the new one)
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch("/api/ai/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text.trim(),
            history,
            workspaceId: DEFAULT_WORKSPACE_ID,
          }),
        });

        const data = await res.json();

        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content:
            data.reply ??
            data.error ??
            "Something went wrong. Please try again.",
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content:
              "I'm having trouble connecting right now. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Financial Assistant</h1>
        <p className="text-sm text-slate-400 mt-1">
          Ask me anything about your finances
        </p>
      </div>

      {/* Chat container */}
      <div
        className="rounded-xl bg-arcana-surface border border-arcana-border flex flex-col"
        style={{ height: "calc(100vh - 220px)" }}
      >
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-arcana-blue/20 mb-4">
                <Sparkles className="w-8 h-8 text-arcana-blue" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Arcana Financial Assistant
              </h3>
              <p className="text-sm text-slate-400 mb-6 max-w-md">
                Ask me about your spending, account balances, trends, or
                transfers. I can look up your financial data to give you real
                answers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left px-4 py-3 rounded-lg bg-arcana-navy border border-arcana-border text-sm text-slate-300 hover:text-white hover:border-arcana-blue transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-arcana-blue/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-arcana-blue" />
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-arcana-blue text-white"
                    : "bg-arcana-navy text-slate-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-arcana-blue/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-arcana-blue" />
              </div>
              <div className="bg-arcana-navy rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-arcana-blue animate-spin" />
                  <span className="text-sm text-slate-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-arcana-border p-4">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances..."
              rows={1}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue resize-none disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex items-center justify-center w-10 h-10 rounded-lg bg-arcana-blue text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
