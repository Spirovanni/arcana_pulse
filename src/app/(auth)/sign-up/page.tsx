import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="rounded-xl bg-arcana-surface border border-arcana-border p-8">
      <h2 className="text-lg font-semibold text-white mb-1">
        Create your account
      </h2>
      <p className="text-sm text-slate-400 mb-6">
        Join Arcana Credit Union and start managing your finances
      </p>

      <form className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              First Name
            </label>
            <input
              type="text"
              placeholder="Alex"
              className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1.5">
              Last Name
            </label>
            <input
              type="text"
              placeholder="Morgan"
              className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
            />
          </div>
        </div>
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
            placeholder="Create a password"
            className="w-full px-3 py-2.5 rounded-lg bg-arcana-navy border border-arcana-border text-white text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-arcana-blue"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-arcana-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          Create Account
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-arcana-sky hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
