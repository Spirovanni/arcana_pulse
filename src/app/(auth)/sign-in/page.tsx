import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8">
      <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
      <p className="text-sm text-slate-400 mb-6">
        Sign in to your Arcana Pulse account
      </p>

      <form className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Email</label>
          <input
            type="email"
            placeholder="you@arcanacu.org"
            className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter your password"
            className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          Sign In
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="text-arcana-sky hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
