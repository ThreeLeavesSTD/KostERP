"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js App Error Caught:", error);
  }, [error]);

  const handleHardReset = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("kost_active_tab");
      } catch {}
      window.location.href = "/";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-neutral-950 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-neutral-900 p-6 sm:p-8 shadow-spatial border border-neutral-200 dark:border-neutral-800 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <div>
          <h2 className="text-lg font-black text-neutral-900 dark:text-white">
            Terjadi Kesalahan Tampilan
          </h2>
          <p className="mt-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {error?.message || "Sistem mendeteksi kendala pada antarmuka. Silakan coba muat ulang."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            onClick={() => reset()}
            variant="default"
            size="sm"
            className="w-full sm:w-auto font-bold text-xs"
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Coba Lagi
          </Button>

          <Button
            onClick={handleHardReset}
            variant="lime"
            size="sm"
            className="w-full sm:w-auto font-black text-xs shadow-lime-glow"
          >
            <Home className="mr-1.5 h-3.5 w-3.5" />
            Kembali ke Beranda
          </Button>
        </div>
      </div>
    </div>
  );
}
