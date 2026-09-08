"use client";

import React, { useState, useActionState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  KeyRound,
} from "lucide-react";
import {
  signInWithPassword,
  signUpWithPassword,
  signInWithOtp,
  AuthActionResult,
} from "@/app/auth/actions";

type AuthMode = "signin" | "signup" | "magic";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("signin");

  const [signInState, signInAction, isSignInPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signInWithPassword, null);

  const [signUpState, signUpAction, isSignUpPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signUpWithPassword, null);

  const [magicState, magicAction, isMagicPending] = useActionState<
    AuthActionResult | null,
    FormData
  >(signInWithOtp, null);

  const currentState =
    mode === "signin" ? signInState : mode === "signup" ? signUpState : magicState;
  const isPending =
    mode === "signin" ? isSignInPending : mode === "signup" ? isSignUpPending : isMagicPending;

  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-slate-700 selection:text-white relative">
      {/* Brand Header */}
      <div className="text-center mb-8 relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-white/[0.12] to-white/[0.03] border border-white/[0.15] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Owed
          </span>
        </Link>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Personal Warranty Vault & Resolution
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-[#0e1118] border border-white/[0.1] rounded-2xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-white/[0.03] p-1 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signin"
                ? "bg-white/[0.1] text-white shadow-sm border border-white/[0.12]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "signup"
                ? "bg-white/[0.1] text-white shadow-sm border border-white/[0.12]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => setMode("magic")}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              mode === "magic"
                ? "bg-white/[0.1] text-white shadow-sm border border-white/[0.12]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Magic Link
          </button>
        </div>

        {/* Status Alerts */}
        {currentState?.error && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="leading-relaxed">{currentState.error}</p>
          </div>
        )}

        {currentState?.message && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
            <p className="leading-relaxed">{currentState.message}</p>
          </div>
        )}

        {/* Forms */}
        {mode === "signin" && (
          <form action={signInAction} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">Password</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-200 disabled:opacity-50 text-slate-950 text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 text-slate-900" />
                </>
              )}
            </button>
          </form>
        )}

        {mode === "signup" && (
          <form action={signUpAction} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Create Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Min 6 characters"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Confirm Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  placeholder="Repeat password"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-200 disabled:opacity-50 text-slate-950 text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4 text-slate-900" />
                </>
              )}
            </button>
          </form>
        )}

        {mode === "magic" && (
          <form action={magicAction} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#11141c] border border-white/[0.08] focus:border-white/[0.2] rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                We will email you a secure login link. No password required.
              </p>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-200 disabled:opacity-50 text-slate-950 text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  Sending Magic Link...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-900" />
                  Send Magic Link
                </>
              )}
            </button>
          </form>
        )}

        {/* Return to Dashboard */}
        <div className="pt-4 border-t border-white/[0.08] text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center gap-1"
          >
            &larr; Return to vault overview
          </Link>
        </div>
      </div>
    </div>
  );
}
