import React, { useState } from "react";
import { UserRole } from "@/types";
import { Building2, Lock, User } from "lucide-react";
import { KostStorage } from "@/lib/storage";

interface LoginFormProps {
  onLogin: (role: UserRole) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    KostStorage.init();
    const result = KostStorage.authenticate(username, password);

    if (result.success && result.role) {
      onLogin(result.role);
    } else {
      setError(
        result.message ||
          "Username atau password salah. Coba: owner/owner123, admin/admin123, atau staff/staff123"
      );
    }
  };

  const handleQuickLogin = (u: string, p: string, role: UserRole) => {
    setUsername(u);
    setPassword(p);
    onLogin(role);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#EDEDED] p-4 dark:bg-[#0A0A0A]">
      <div className="w-full max-w-md rounded-4xl bg-white p-8 shadow-spatial dark:bg-[#18181B] border border-white/80 dark:border-white/10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#0A0A0A] text-[#D9FF43] shadow-spatial dark:bg-white dark:text-[#0A0A0A]">
            <Building2 className="h-8 w-8" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">Kost ERP</h1>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-black text-[#0A0A0A]">Spatial</span>
          </div>
          <p className="mt-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            Automated Property Operations & Financial Concierge
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
              Username
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <User className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 py-3 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="Masukkan username"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-neutral-700 dark:text-neutral-300">
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
                className="block w-full rounded-2xl border border-neutral-200/80 bg-neutral-50 py-3 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-white"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full justify-center rounded-full bg-[#0A0A0A] py-3.5 px-4 text-sm font-black text-white shadow-spatial hover:bg-neutral-800 focus:outline-none transition-all dark:bg-white dark:text-[#0A0A0A]"
          >
            Masuk ke Workspace ↗
          </button>
        </form>

        <div className="mt-8 border-t border-neutral-100 pt-6 dark:border-white/10">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3 text-center">
            Pilih Role Cepat (Demo):
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin("owner", "owner123", "owner")}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-2.5 text-center text-xs font-bold text-neutral-800 hover:bg-[#D9FF43] hover:text-[#0A0A0A] hover:border-[#D9FF43] transition-all dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              👑 Owner
            </button>
            <button
              onClick={() => handleQuickLogin("admin", "admin123", "admin")}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-2.5 text-center text-xs font-bold text-neutral-800 hover:bg-[#D9FF43] hover:text-[#0A0A0A] hover:border-[#D9FF43] transition-all dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              💼 Admin
            </button>
            <button
              onClick={() => handleQuickLogin("staff", "staff123", "cleaning_staff")}
              className="rounded-2xl border border-neutral-200 bg-neutral-50 p-2.5 text-center text-xs font-bold text-neutral-800 hover:bg-[#D9FF43] hover:text-[#0A0A0A] hover:border-[#D9FF43] transition-all dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
            >
              🧹 Staff
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
