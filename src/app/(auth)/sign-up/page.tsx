"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";

export default function SignUpPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [membershipType, setMembershipType] = useState<"standard" | "student" | "employer">("standard");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create user in Appwrite via custom route
      const res = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, membershipType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign up failed");
        return;
      }

      // Step 2: Auto sign-in via NextAuth
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Sign-in failed but account was created — show verification message
        setCreated(true);
        return;
      }

      // Show verification message briefly then redirect
      setCreated(true);
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 3000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return (
      <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8 text-center">
        <Mail className="h-8 w-8 text-arcana-sky mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">
          Check your email
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          We&apos;ve sent a verification link to{" "}
          <span className="text-white">{email}</span>. Please check your inbox
          to verify your account.
        </p>
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400 mb-4">
          Account created successfully! Redirecting...
        </div>
        <Link
          href="/"
          className="text-sm text-arcana-sky hover:underline"
        >
          Continue to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8">
      <h2 className="text-lg font-semibold text-white mb-1">
        Create your account
      </h2>
      <p className="text-sm text-slate-400 mb-6">
        Join Arcana Credit Union and start managing your finances
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              First Name
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Alex"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Morgan"
              required
              className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
            />
          </div>
        </div>
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
          <label className="block text-sm text-slate-300 mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min. 8 characters)"
            required
            className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
          />
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-2">
            Account Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setMembershipType("standard")}
              className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                membershipType === "standard"
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-arcana-navy border-arcana-border text-slate-400 hover:text-slate-200"
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setMembershipType("student")}
              className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                membershipType === "student"
                  ? "bg-purple-500/20 border-purple-500 text-purple-400"
                  : "bg-arcana-navy border-arcana-border text-slate-400 hover:text-slate-200"
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => setMembershipType("employer")}
              className={`py-2 px-3 rounded-lg text-xs font-medium border transition-colors ${
                membershipType === "employer"
                  ? "bg-teal-500/20 border-teal-500 text-teal-400"
                  : "bg-arcana-navy border-arcana-border text-slate-400 hover:text-slate-200"
              }`}
            >
              Employer
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-center text-xs text-secondary/60 mt-4 leading-relaxed">
        By creating an account you agree to our{" "}
        <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
        {" "}and{" "}
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
      </p>

      <p className="text-center text-sm text-slate-400 mt-4">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-arcana-sky hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
