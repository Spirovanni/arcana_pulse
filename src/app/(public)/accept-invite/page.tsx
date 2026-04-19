"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const token = searchParams.get("token") ?? "";

  const [phase, setPhase] = useState<"loading" | "ready" | "accepting" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setPhase("error");
      setError("Invalid invite link — no token found.");
      return;
    }
    if (status === "loading") return;
    setPhase("ready");
  }, [token, status]);

  async function handleAccept() {
    if (!session) {
      // Redirect to sign-in with return URL
      router.push(`/sign-in?callbackUrl=/accept-invite?token=${encodeURIComponent(token)}`);
      return;
    }
    setPhase("accepting");
    try {
      const res = await fetch("/api/workspace/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhase("success");
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
      setPhase("error");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 text-primary font-headline font-bold text-lg tracking-[4px] uppercase hover:opacity-80 transition-opacity justify-center">
          <Zap className="size-5" />
          Arcana
        </Link>

        <div className="rounded-sm bg-surface-container-high border border-outline p-8 text-center space-y-6">
          {(phase === "loading") && (
            <>
              <Loader2 className="size-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-secondary uppercase tracking-wider">Verifying invite...</p>
            </>
          )}

          {phase === "ready" && (
            <>
              <div className="p-3 bg-primary/10 rounded-sm inline-block">
                <Zap className="size-6 text-primary" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-light text-on-surface tracking-tight">
                  You&apos;ve been invited
                </h1>
                <p className="text-sm text-secondary leading-relaxed">
                  You&apos;ve been invited to join an Arcana Pulse workspace.
                  {!session && " Sign in or create an account to accept."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAccept}
                className="w-full btn-metallic py-3 text-sm font-bold uppercase tracking-[2px] flex items-center justify-center gap-2"
              >
                {session ? "Accept Invitation" : "Sign In to Accept"}
              </button>
              {!session && (
                <p className="text-xs text-secondary">
                  No account?{" "}
                  <Link href={`/sign-up?callbackUrl=/accept-invite?token=${encodeURIComponent(token)}`} className="text-primary hover:underline">
                    Create one free
                  </Link>
                </p>
              )}
            </>
          )}

          {phase === "accepting" && (
            <>
              <Loader2 className="size-8 text-primary animate-spin mx-auto" />
              <p className="text-sm text-secondary uppercase tracking-wider">Joining workspace...</p>
            </>
          )}

          {phase === "success" && (
            <>
              <CheckCircle className="size-8 text-arcana-success mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-light text-on-surface">Welcome to the workspace</h2>
                <p className="text-sm text-secondary">Redirecting to your dashboard...</p>
              </div>
            </>
          )}

          {phase === "error" && (
            <>
              <XCircle className="size-8 text-arcana-danger mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-light text-on-surface">Invite unavailable</h2>
                <p className="text-sm text-secondary">{error}</p>
              </div>
              <Link href="/" className="text-xs text-primary hover:underline uppercase tracking-widest">
                Return home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  );
}
