"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  Sparkles,
  User,
  ChevronDown,
  Check,
  Mic,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { DEFAULT_WORKSPACE_ID } from "@/lib/services/workspace";
import type { AssistantModelOption } from "@/lib/services/ai/assistant";
import { ASSISTANT_MODELS } from "@/lib/services/ai/assistant";
import { notifyAiUsageUpdated } from "@/lib/aiUsageRefresh";

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

const FREE_FLOW_SILENCE_TIMEOUT_MS = 1400;
const FREE_FLOW_MIN_TURN_MS = 900;
const FREE_FLOW_SILENCE_RMS_THRESHOLD = 0.02;

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
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [freeFlowActive, setFreeFlowActive] = useState(false);
  const [voiceTurnState, setVoiceTurnState] = useState<
    "idle" | "listening" | "end_turn" | "transcribing" | "thinking" | "speaking"
  >("idle");
  const [silenceCountdownMs, setSilenceCountdownMs] = useState<number | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [allowSpeechInterrupt, setAllowSpeechInterrupt] = useState(true);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AssistantModelOption>(ASSISTANT_MODELS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceIntervalRef = useRef<number | null>(null);
  const silenceStartedAtRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number>(0);
  const sendMessageRef = useRef<
    (text: string, options?: { fromVoice?: boolean }) => Promise<void>
  >(async () => undefined);
  const startListeningRef = useRef<() => void>(() => undefined);
  const freeFlowActiveRef = useRef(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    freeFlowActiveRef.current = freeFlowActive;
  }, [freeFlowActive]);

  const clearSilenceDetection = useCallback(() => {
    if (silenceIntervalRef.current !== null) {
      window.clearInterval(silenceIntervalRef.current);
      silenceIntervalRef.current = null;
    }
    silenceStartedAtRef.current = null;
    setSilenceCountdownMs(null);
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
  }, []);

  const stopAssistantSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    setIsAssistantSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      clearSilenceDetection();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      stopAssistantSpeech();
    };
  }, [clearSilenceDetection, stopAssistantSpeech]);

  const speakAssistantReply = useCallback(
    async (text: string): Promise<void> => {
      if (!voiceEnabled || !text.trim()) return;
      try {
        const res = await fetch("/api/ai/assistant/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            workspaceId: DEFAULT_WORKSPACE_ID,
          }),
        });
        if (!res.ok) return;
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        stopAssistantSpeech();
        currentAudioUrlRef.current = audioUrl;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        setIsAssistantSpeaking(true);
        await new Promise<void>((resolve) => {
          const finish = () => {
            if (audioRef.current === audio) {
              audioRef.current = null;
            }
            if (currentAudioUrlRef.current === audioUrl) {
              URL.revokeObjectURL(audioUrl);
              currentAudioUrlRef.current = null;
            }
            setIsAssistantSpeaking(false);
            resolve();
          };
          audio.onended = () => {
            finish();
          };
          audio.onerror = () => {
            finish();
          };
          void audio.play().catch(() => finish());
        });
      } catch {
        // Voice playback is optional; fail silently.
        setIsAssistantSpeaking(false);
      }
    },
    [stopAssistantSpeech, voiceEnabled]
  );

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    clearSilenceDetection();
    setListening(false);
    setVoiceTurnState("idle");
  }, [clearSilenceDetection]);

  const stopFreeFlow = useCallback(() => {
    setFreeFlowActive(false);
    stopListening();
    stopAssistantSpeech();
  }, [stopAssistantSpeech, stopListening]);

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      const extension = audioBlob.type.includes("mp4")
        ? "mp4"
        : audioBlob.type.includes("ogg")
        ? "ogg"
        : "webm";
      const file = new File([audioBlob], `voice.${extension}`, {
        type: audioBlob.type || "audio/webm",
      });

      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch("/api/ai/assistant/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = (await res.json().catch(() => ({}))) as {
        transcript?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Voice transcription failed");
      return (data.transcript ?? "").trim();
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-voice-error`,
          role: "assistant",
          content:
            error instanceof Error
              ? `Voice input failed: ${error.message}`
              : "Voice input failed. Please try again.",
        },
      ]);
      return "";
    }
  }, []);

  const setupFreeFlowSilenceDetection = useCallback(
    (stream: MediaStream, recorder: MediaRecorder) => {
      clearSilenceDetection();
      try {
        const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextCtor) return;

        const context = new AudioContextCtor();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);

        recordingStartedAtRef.current = Date.now();
        silenceIntervalRef.current = window.setInterval(() => {
          if (recorder.state !== "recording" || !freeFlowActiveRef.current) return;
          analyser.getByteTimeDomainData(data);

          let sumSquares = 0;
          for (let i = 0; i < data.length; i += 1) {
            const normalized = (data[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / data.length);
          const now = Date.now();
          const recordingElapsed = now - recordingStartedAtRef.current;

          if (rms < FREE_FLOW_SILENCE_RMS_THRESHOLD && recordingElapsed > FREE_FLOW_MIN_TURN_MS) {
            if (silenceStartedAtRef.current === null) {
              silenceStartedAtRef.current = now;
            }
            const silenceElapsed = now - silenceStartedAtRef.current;
            const remaining = Math.max(0, FREE_FLOW_SILENCE_TIMEOUT_MS - silenceElapsed);
            setSilenceCountdownMs(remaining);
            if (silenceElapsed >= FREE_FLOW_SILENCE_TIMEOUT_MS) {
              setVoiceTurnState("end_turn");
              recorder.stop();
            }
          } else {
            silenceStartedAtRef.current = null;
            setSilenceCountdownMs(FREE_FLOW_SILENCE_TIMEOUT_MS);
          }
        }, 120);
      } catch {
        // Fallback: keep manual stop behavior if analyser init fails.
      }
    },
    [clearSilenceDetection]
  );

  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isAssistantSpeaking) {
      if (!allowSpeechInterrupt) {
        return;
      }
      stopAssistantSpeech();
    }
    if (!window.navigator.mediaDevices?.getUserMedia) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-voice-unsupported`,
          role: "assistant",
          content: "Microphone recording is not supported on this browser.",
        },
      ]);
      return;
    }

    void (async () => {
      try {
        const stream = await window.navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = [];
        setVoiceTurnState("listening");
        setSilenceCountdownMs(FREE_FLOW_SILENCE_TIMEOUT_MS);

        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        recorder.onerror = () => {
          setListening(false);
          clearSilenceDetection();
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          setFreeFlowActive(false);
          setVoiceTurnState("idle");
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now()}-voice-recorder-error`,
              role: "assistant",
              content: "Voice recording failed. Please try again.",
            },
          ]);
        };

        recorder.onstop = async () => {
          setListening(false);
          clearSilenceDetection();
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

          const blob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          audioChunksRef.current = [];
          if (blob.size === 0) {
            setVoiceTurnState("idle");
            return;
          }

          setTranscribing(true);
          setVoiceTurnState("transcribing");
          let transcript = "";
          try {
            transcript = await transcribeAudio(blob);
          } finally {
            setTranscribing(false);
          }
          if (!transcript) {
            setVoiceTurnState("idle");
            if (freeFlowActiveRef.current && !loading) {
              window.setTimeout(() => {
                if (freeFlowActiveRef.current) {
                  startListeningRef.current();
                }
              }, 300);
            }
            return;
          }
          setInput(transcript);

          if (voiceMode) {
            void sendMessageRef.current(transcript, { fromVoice: true });
            setInput("");
          }
        };

        setListening(true);
        if (freeFlowActiveRef.current) {
          setupFreeFlowSilenceDetection(stream, recorder);
        }
        recorder.start();
      } catch (error) {
        setListening(false);
        clearSilenceDetection();
        setFreeFlowActive(false);
        setVoiceTurnState("idle");
        const reason =
          error instanceof DOMException && error.name === "NotAllowedError"
            ? "Microphone access is blocked. Please allow microphone permissions for this site."
            : "Unable to access your microphone right now. Please check browser permissions and try again.";
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-voice-permission-error`,
            role: "assistant",
            content: reason,
          },
        ]);
      }
    })();
  }, [
    allowSpeechInterrupt,
    clearSilenceDetection,
    isAssistantSpeaking,
    loading,
    setupFreeFlowSilenceDetection,
    stopAssistantSpeech,
    transcribeAudio,
    voiceMode,
  ]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const startFreeFlow = useCallback(() => {
    setVoiceMode(true);
    setFreeFlowActive(true);
    setVoiceTurnState("listening");
    setSilenceCountdownMs(FREE_FLOW_SILENCE_TIMEOUT_MS);
    if (!listening && !transcribing && !loading) {
      startListeningRef.current();
    }
  }, [listening, transcribing, loading]);

  const sendMessage = useCallback(
    async (text: string, options?: { fromVoice?: boolean }) => {
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
      if (options?.fromVoice && freeFlowActiveRef.current) {
        setVoiceTurnState("thinking");
      }

      let shouldResumeFreeFlow = false;
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
        if (options?.fromVoice && freeFlowActiveRef.current) {
          setVoiceTurnState("speaking");
          await speakAssistantReply(assistantMsg.content);
          shouldResumeFreeFlow = true;
        } else {
          void speakAssistantReply(assistantMsg.content);
        }
        if (res.ok) notifyAiUsageUpdated();
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
        if (
          shouldResumeFreeFlow &&
          freeFlowActiveRef.current &&
          !listening &&
          !transcribing
        ) {
          window.setTimeout(() => {
            if (freeFlowActiveRef.current) {
              setVoiceTurnState("listening");
              startListeningRef.current();
            }
          }, 450);
        } else if (!freeFlowActiveRef.current) {
          setVoiceTurnState("idle");
        }
      }
    },
    [loading, messages, selectedModel, speakAssistantReply, listening, transcribing]
  );

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const selectedBadgeClass = BADGE_COLORS[selectedModel.badgeColor] ?? BADGE_COLORS.purple;
  const turnLabel =
    voiceTurnState === "listening"
      ? "Listening"
      : voiceTurnState === "end_turn"
      ? "End of turn detected"
      : voiceTurnState === "transcribing"
      ? "Transcribing"
      : voiceTurnState === "thinking"
      ? "Thinking"
      : voiceTurnState === "speaking"
      ? "Speaking"
      : "Idle";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 lg:space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-arcana-border bg-arcana-surface/80 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Financial Assistant</h1>
            <p className="text-sm text-slate-400 mt-1">
              Ask me anything about your finances
            </p>
          </div>
          {/* Active model badge */}
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs ${selectedBadgeClass}`}>
            <Sparkles className="w-3 h-3" />
            {selectedModel.label}
          </div>
        </div>
      </div>

      {/* Chat container */}
      <div
        className="rounded-2xl bg-arcana-surface border border-arcana-border flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.25)]"
        style={{ minHeight: "560px", height: "calc(100vh - 300px)" }}
      >
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 space-y-5">
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
        <div className="border-t border-arcana-border bg-arcana-navy/20 p-3 sm:p-4 lg:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${
                  listening
                    ? "bg-red-500/20 border-red-400/30 text-red-300"
                    : voiceMode
                    ? "bg-arcana-blue/20 border-arcana-blue/40 text-arcana-blue"
                    : "bg-arcana-navy border-arcana-border text-slate-300 hover:border-arcana-blue"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {listening ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {listening ? "Recording..." : voiceMode ? "Talk Mode" : "Tap To Talk"}
              </button>
              <button
                type="button"
                onClick={() => setVoiceMode((v) => !v)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${
                  voiceMode
                    ? "bg-arcana-blue/20 border-arcana-blue/40 text-arcana-blue"
                    : "bg-arcana-navy border-arcana-border text-slate-400 hover:border-arcana-blue"
                }`}
                title="When enabled, speech is sent automatically when listening ends."
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto Send Voice
              </button>
              <button
                type="button"
                onClick={freeFlowActive ? stopFreeFlow : startFreeFlow}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${
                  freeFlowActive
                    ? "bg-red-500/20 border-red-400/30 text-red-300"
                    : "bg-arcana-navy border-arcana-border text-slate-300 hover:border-arcana-blue"
                }`}
                title="Continuous hands-free conversation powered by ElevenLabs transcription and voice output."
              >
                {freeFlowActive ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                {freeFlowActive ? "Stop Free Flow" : "Free Flow Agent"}
              </button>
              <button
                type="button"
                onClick={() => setAllowSpeechInterrupt((prev) => !prev)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-colors ${
                  allowSpeechInterrupt
                    ? "bg-arcana-blue/20 border-arcana-blue/40 text-arcana-blue"
                    : "bg-arcana-navy border-arcana-border text-slate-400 hover:border-arcana-blue"
                }`}
                title="When enabled, tapping the mic while the assistant is speaking will interrupt speech and start your turn."
              >
                <VolumeX className="w-3.5 h-3.5" />
                Interrupt Speech
              </button>
            </div>
            <div className="hidden sm:block text-[10px] uppercase tracking-wider text-slate-500">
              {isAssistantSpeaking && allowSpeechInterrupt
                ? "Assistant speaking — tap mic to interrupt"
                : transcribing
                ? "Transcribing with ElevenLabs..."
                : freeFlowActive
                ? "Free flow conversation active"
                : voiceMode
                ? "Voice mode enabled"
                : "Manual send mode"}
            </div>
          </div>

          {freeFlowActive && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-arcana-blue/30 bg-arcana-blue/10 px-3 py-2 text-xs text-arcana-blue">
              <span className="inline-block h-2 w-2 rounded-full bg-arcana-blue animate-pulse" />
              <span>{turnLabel}</span>
              {voiceTurnState === "listening" && silenceCountdownMs !== null ? (
                <span className="text-[10px] uppercase tracking-wide text-arcana-blue/80">
                  End turn in {Math.max(0.2, silenceCountdownMs / 1000).toFixed(1)}s of silence
                </span>
              ) : null}
            </div>
          )}

          {transcribing && (
            <div className="inline-flex items-center gap-2 rounded-lg border border-arcana-blue/30 bg-arcana-blue/10 px-3 py-2 text-xs text-arcana-blue">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Transcribing with ElevenLabs...
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Model selector */}
            <ModelSelector selected={selectedModel} onChange={setSelectedModel} />

            {/* Text input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances..."
              rows={2}
              disabled={loading}
              className="flex-1 min-h-[44px] max-h-32 px-4 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue resize-none disabled:opacity-50"
            />

            {/* Voice output toggle */}
            <button
              type="button"
              onClick={() => setVoiceEnabled((v) => !v)}
              title={voiceEnabled ? "Disable voice replies" : "Enable voice replies"}
              className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors flex-shrink-0 ${
                voiceEnabled
                  ? "bg-arcana-blue/20 border-arcana-blue/30 text-arcana-blue"
                  : "bg-arcana-navy border-arcana-border text-slate-400 hover:border-arcana-blue"
              }`}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

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
