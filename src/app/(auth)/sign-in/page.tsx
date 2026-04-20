"use client";

import { useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

type Step = "credentials" | "mfa";

export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const mfaInputRef = useRef<HTMLInputElement>(null);

  async function handleCredentials(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error === "MFA_REQUIRED") {
        setStep("mfa");
        setTimeout(() => mfaInputRef.current?.focus(), 100);
        return;
      }

      if (result?.error) {
        setError("Invalid email or password");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMfa(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        mfaCode: mfaCode.replace(/\s/g, ""),
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid code. Try again or use a recovery code.");
        setMfaCode("");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "mfa") {
    return (
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-5 w-5 text-arcana-sky" />
          <h2 className="text-lg font-semibold text-white">Two-factor authentication</h2>
        </div>
        <p className="text-sm text-slate-400 mb-6">
          Enter the 6-digit code from your authenticator app, or a recovery code.
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleMfa} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">Verification code</label>
            <input
              ref={mfaInputRef}
              type="text"
              inputMode="numeric"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              placeholder="000000"
              maxLength={20}
              required
              className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue tracking-widest text-center font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Verifying..." : "Verify"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => { setStep("credentials"); setError(""); setMfaCode(""); }}
          className="mt-4 w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8">
      <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
      <p className="text-sm text-slate-400 mb-6">
        Sign in to your Arcana Pulse account
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg bg-white text-slate-800 text-sm font-medium hover:bg-slate-100 transition-colors border border-slate-200 mb-4"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M47.532 24.552c0-1.636-.147-3.2-.42-4.701H24v8.887h13.164c-.567 3.057-2.29 5.647-4.877 7.384v6.136h7.894c4.618-4.254 7.351-10.52 7.351-17.706z" fill="#4285F4"/>
          <path d="M24 48c6.624 0 12.18-2.196 16.24-5.956l-7.894-6.136c-2.19 1.469-4.992 2.337-8.346 2.337-6.417 0-11.852-4.335-13.797-10.162H1.96v6.34C5.998 42.692 14.352 48 24 48z" fill="#34A853"/>
          <path d="M10.203 28.083A14.94 14.94 0 0 1 9.391 24c0-1.411.243-2.78.812-4.083v-6.34H1.96A23.956 23.956 0 0 0 0 24c0 3.876.927 7.546 2.572 10.828l7.631-6.745z" fill="#FBBC05"/>
          <path d="M24 9.558c3.617 0 6.867 1.244 9.421 3.682l7.067-7.067C36.172 2.188 30.618 0 24 0 14.352 0 5.998 5.308 1.96 13.172l8.243 6.34C12.148 13.893 17.583 9.558 24 9.558z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-arcana-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-arcana-surface px-3 text-xs text-slate-500">or sign in with email</span>
        </div>
      </div>

      <form onSubmit={handleCredentials} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@arcanacu.org"
            required
            className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm text-slate-300">Password</label>
            <Link
              href="/forgot-password"
              className="text-xs text-arcana-sky hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-4 rounded-lg bg-arcana-navy/50 border border-arcana-border px-4 py-3">
        <p className="text-xs text-slate-500 mb-1">Demo credentials</p>
        <p className="text-xs text-slate-400">
          <span className="text-slate-300">alex@arcanacu.org</span> /{" "}
          <span className="text-slate-300">password123</span>
        </p>
      </div>

      <p className="text-center text-sm text-slate-400 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-arcana-sky hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
