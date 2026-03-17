"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 text-center">
          <Loader2 className="h-8 w-8 text-arcana-sky animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    token ? "loading" : "error"
  );
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "No verification token provided."
  );

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          setStatus("success");
        } else {
          const data = await res.json();
          setErrorMessage(data.error || "Verification failed");
          setStatus("error");
        }
      } catch {
        setErrorMessage("Something went wrong. Please try again.");
        setStatus("error");
      }
    }

    verify();
  }, [token]);

  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 text-center">
      {status === "loading" && (
        <>
          <Loader2 className="h-8 w-8 text-arcana-sky animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Verifying your email...
          </h2>
          <p className="text-sm text-slate-400">
            Please wait while we verify your email address.
          </p>
        </>
      )}

      {status === "success" && (
        <>
          <CheckCircle2 className="h-8 w-8 text-arcana-success mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Email verified!
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Your email has been successfully verified. You can now sign in to
            your account.
          </p>
          <Link
            href="/sign-in"
            className="inline-block px-6 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            Sign In
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <XCircle className="h-8 w-8 text-arcana-danger mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-white mb-2">
            Verification failed
          </h2>
          <p className="text-sm text-slate-400 mb-6">{errorMessage}</p>
          <div className="flex flex-col gap-3 items-center">
            <Link
              href="/sign-in"
              className="inline-block px-6 py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-sm text-arcana-sky hover:underline"
            >
              Create a new account
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
