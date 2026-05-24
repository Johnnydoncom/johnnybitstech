"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import { Lock, Mail, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(200,60%,6%)] via-[hsl(200,70%,10%)] to-[hsl(192,95%,28%)/0.3] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/johnnybits-logo.png" alt="Johnnybits" className="h-12 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-sm text-white/60 mt-1">Sign in to manage your website</p>
        </div>

        <form action={action} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          {state?.error && (
            <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="admin@johnnybits.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-white placeholder:text-white/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-brand hover:opacity-90 transition-all disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Sign in"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-6">
          Protected admin area · Johnnybits Technology
        </p>
      </div>
    </div>
  );
}
