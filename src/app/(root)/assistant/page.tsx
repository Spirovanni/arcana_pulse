"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, Sparkles, User, ChevronDown, Check } from "lucide-react";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import type { AssistantModelOption } from "@/lib/services/ai/assistant";
import { ASSISTANT_MODELS } from "@/lib/services/ai/assistant";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  "How much did I spend on food this month?",
  "What are my biggest expense categories?",
  "Show me my monthly income vs expenses trend",
  "What is my current savings rate?",
  "List my linked bank accounts and balances",
  "What are my most recent transfers?",
];

const BADGE_COLORS: Record<string, string> = {
  purple: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  green: "bg-green-500/20 text-green-300 border-green-500/30",
  blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

// ---------------------------------------------------------------------------
// ModelSelector component
// ---------------------------------------------------------------------------

function ModelSelector({
  selected,
  onChange,
}: {
  selected: AssistantModelOption;
  onChange: (m: AssistantModelOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const badgeClass = BADGE_COLORS[selected.badgeColor] ?? BADGE_COLORS.purple;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-arcana-navy border border-arcana-border text-xs text-slate-300 hover:border-arcana-blue transition-colors"
      >
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badgeClass}`}>
          {selected.badge}
        </span>
        <span className="hidden sm:inline">{selected.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-0 w-64 rounded-xl bg-arcana-surface border border-arcana-border shadow-xl z-10 py-1 overflow-hidden">
          <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Select Model
          </p>

          {(["anthropic", "openai", "google"] as const).map((provider) => {
            const models = ASSISTANT_MODELS.filter((m) => m.provider === provider);
            const providerLabel =
              provider === "anthropic" ? "Anthropic" : provider === "openai" ? "OpenAI" : "Google";
            return (
              <div key={provider}>
                <p className="px-3 py-1 text-[9px] font-semibold text-slate-600 uppercase tracking-widest">
                  {providerLabel}
                </p>
                {models.map((m) => {
                  const bc = BADGE_COLORS[m.badgeColor] ?? BADGE_COLORS.purple;
                  const isSelected = m.id === selected.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        onChange(m);
                        setOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-arcana-navy transition-colors ${
                        isSelected ? "bg-arcana-navy/60" : ""
                      }`}
                    >
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${bc} flex-shrink-0`}>
                        {m.badge}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs text-slate-200">{m.label}</span>
                        <span className="block text-[10px] text-slate-500">{m.description}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-arcana-blue flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AssistantModelOption>(ASSISTANT_MODELS[0]);
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

      const history = messages.map((m) => ({ role: m.role, content: m.content }));

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
            model: selectedModel.id,
            provider: selectedModel.provider,
          }),
        });

        const data = await res.json();

        const assistantMsg: Message = {
          id: `msg-${Date.now()}-assistant`,
          role: "assistant",
          content: data.reply ?? data.error ?? "Something went wrong. Please try again.",
          model: data.model,
        };

        setMessages((prev) => [...prev, assistantMsg]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: "I'm having trouble connecting right now. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, selectedModel]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const selectedBadgeClass = BADGE_COLORS[selectedModel.badgeColor] ?? BADGE_COLORS.purple;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Assistant</h1>
          <p className="text-sm text-slate-400 mt-1">
            Ask me anything about your finances
          </p>
        </div>
        {/* Active model badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${selectedBadgeClass}`}>
          <Sparkles className="w-3 h-3" />
          {selectedModel.label}
        </div>
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
              <p className="text-sm text-slate-400 mb-2 max-w-md">
                Ask me about your spending, account balances, trends, or
                transfers. I can look up your financial data to give you real
                answers.
              </p>
              <p className="text-xs text-slate-500 mb-6">
                Powered by{" "}
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${selectedBadgeClass}`}>
                  {selectedModel.badge}
                </span>
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
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-arcana-blue/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-arcana-blue" />
                </div>
              )}
              <div className="max-w-[75%] flex flex-col gap-1">
                <div
                  className={`rounded-xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-arcana-blue text-white"
                      : "bg-arcana-navy text-slate-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {/* Model attribution on assistant messages */}
                {msg.role === "assistant" && msg.model && (() => {
                  const opt = ASSISTANT_MODELS.find((m) => m.id === msg.model);
                  if (!opt) return null;
                  const bc = BADGE_COLORS[opt.badgeColor] ?? BADGE_COLORS.purple;
                  return (
                    <span className={`self-start px-1.5 py-0.5 rounded border text-[9px] font-semibold ${bc}`}>
                      {opt.badge}
                    </span>
                  );
                })()}
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
                  <span className="text-sm text-slate-400">
                    Thinking with {selectedModel.label}...
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-arcana-border p-4">
          <div className="flex items-end gap-2">
            {/* Model selector */}
            <ModelSelector selected={selectedModel} onChange={setSelectedModel} />

            {/* Text input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances..."
              rows={1}
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue resize-none disabled:opacity-50"
            />

            {/* Send button */}
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
