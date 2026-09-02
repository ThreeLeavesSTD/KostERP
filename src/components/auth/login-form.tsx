"use client";

import React, { useState } from "react";
import { Building2, Lock, Mail, User, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function LoginForm() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          setError("Nama lengkap wajib diisi.");
          setIsSubmitting(false);
          return;
        }

        const result = await signUp(email, password, fullName, phone);
        if (result.error) {
          setError(result.error);
        } else if (result.message) {
          setSuccessMessage(result.message);
          // Jika signup sukses dan sudah otomatis login, AuthContext akan otomatis update
        }
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(
            result.error === "Invalid login credentials"
              ? "Email atau password salah. Silakan periksa kembali."
              : result.error
          );
        }
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada sistem autentikasi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EDEDED] p-4 dark:bg-[#0A0A0A]">
      <div className="w-full max-w-md rounded-4xl bg-white p-8 shadow-spatial dark:bg-[#18181B] border border-white/80 dark:border-white/10">
        {/* Header Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0A0A0A] text-[#D9FF43] shadow-spatial dark:bg-white dark:text-[#0A0A0A]">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Kost ERP
            </h1>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-black text-[#0A0A0A]">
              Pro
            </span>
          </div>
          <p className="mt-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Automated Property Operations & Financial Concierge
          </p>
        </div>

        {/* Tab Toggle: Masuk vs Daftar Akun */}
        <div className="mb-6 flex rounded-2xl bg-neutral-100 p-1 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/50">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError("");
              setSuccessMessage("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isSignUp
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            }`}
          >
            Masuk (Sign In)
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError("");
              setSuccessMessage("");
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isSignUp
                ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white"
                : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
            }`}
          >
            Daftar (Sign Up)
          </button>
        </div>

        {/* Info Alert untuk user pertama */}
        {isSignUp && (
          <div className="mb-4 flex items-start gap-2.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-200">
            <Sparkles className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Pendaftar Pertama:</strong> Akun pertama yang didaftarkan di sistem ini akan
              otomatis diset menjadi <strong>Owner</strong> utama properti.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            {successMessage}
          </div>
        )}

        {/* Main Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSignUp && (
            <>
              <div>
                <label className="mb-1 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 py-2.5 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    placeholder="Contoh: Budi Santoso"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  Nomor WhatsApp (Opsional)
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <span className="text-xs font-bold text-neutral-400">+62</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 py-2.5 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                    placeholder="81234567890"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Alamat Email
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Mail className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 py-2.5 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="nama@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <Lock className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 py-2.5 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0A0A0A] py-3.5 px-4 text-sm font-black text-white shadow-spatial hover:bg-neutral-800 focus:outline-none transition-all disabled:opacity-60 dark:bg-white dark:text-[#0A0A0A]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : isSignUp ? (
              <>
                <span>Daftar Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Masuk ke Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-neutral-100 pt-4 text-center dark:border-white/10">
          <p className="text-[11px] text-neutral-400">
            Dilindungi oleh Supabase Auth & Row Level Security (RLS) PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
}
