"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
  Trash2,
  HelpCircle,
  AlertOctagon,
} from "lucide-react";
import { notify, ToastItem, ConfirmOptions, AlertOptions } from "@/lib/notify";
import { cn } from "@/lib/utils";

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    options: ConfirmOptions;
    resolve: (val: boolean) => void;
  } | null>(null);
  const [alertDialog, setAlertDialog] = useState<{
    options: AlertOptions;
    resolve: () => void;
  } | null>(null);

  useEffect(() => {
    const unsubToasts = notify.subscribeToasts((items) => {
      setToasts(items);
    });

    const unsubConfirm = notify.subscribeConfirm((options, resolve) => {
      if (options && resolve) {
        setConfirmDialog({ options, resolve });
      } else {
        setConfirmDialog(null);
      }
    });

    const unsubAlert = notify.subscribeAlert((options, resolve) => {
      if (options && resolve) {
        setAlertDialog({ options, resolve });
      } else {
        setAlertDialog(null);
      }
    });

    return () => {
      unsubToasts();
      unsubConfirm();
      unsubAlert();
    };
  }, []);

  const handleConfirm = (value: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(value);
      setConfirmDialog(null);
    }
  };

  const handleAlertClose = () => {
    if (alertDialog) {
      alertDialog.resolve();
      setAlertDialog(null);
    }
  };

  return (
    <>
      {children}

      {/* TOAST NOTIFICATION CONTAINER */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 top-3 z-[9999] flex w-auto flex-col gap-2.5 sm:left-auto sm:right-4 sm:top-4 sm:w-full sm:max-w-md"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto relative overflow-hidden rounded-2xl p-4 shadow-2xl transition-all duration-300 transform translate-y-0 opacity-100",
              "border backdrop-blur-xl bg-white/95 dark:bg-[#18181b]/95",
              toast.type === "success" && "border-emerald-500/30 text-emerald-950 dark:text-emerald-50 shadow-emerald-500/10",
              toast.type === "error" && "border-rose-500/30 text-rose-950 dark:text-rose-50 shadow-rose-500/10",
              toast.type === "warning" && "border-amber-500/30 text-amber-950 dark:text-amber-50 shadow-amber-500/10",
              toast.type === "info" && "border-blue-500/30 text-blue-950 dark:text-blue-50 shadow-blue-500/10"
            )}
          >
            <div className="flex items-start gap-3.5">
              {/* Icon */}
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  toast.type === "success" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                  toast.type === "error" && "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                  toast.type === "warning" && "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                  toast.type === "info" && "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                )}
              >
                {toast.type === "success" && <CheckCircle2 className="h-5 w-5" />}
                {toast.type === "error" && <XCircle className="h-5 w-5" />}
                {toast.type === "warning" && <AlertTriangle className="h-5 w-5" />}
                {toast.type === "info" && <Info className="h-5 w-5" />}
              </div>

              {/* Text */}
              <div className="flex-1 pt-0.5 min-w-0">
                <p className="text-xs font-extrabold tracking-tight text-neutral-900 dark:text-white leading-snug">
                  {toast.title}
                </p>
                {toast.message && (
                  <p className="mt-0.5 text-[11px] font-medium text-neutral-600 dark:text-neutral-300 leading-relaxed break-words">
                    {toast.message}
                  </p>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => notify.removeToast(toast.id)}
                aria-label="Tutup pemberitahuan"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 transition-colors sm:h-7 sm:w-7"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Bottom animated progress bar */}
            {toast.duration && toast.duration > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-100 dark:bg-neutral-800/50">
                <div
                  className={cn(
                    "h-full animate-toast-progress origin-left",
                    toast.type === "success" && "bg-emerald-500",
                    toast.type === "error" && "bg-rose-500",
                    toast.type === "warning" && "bg-amber-500",
                    toast.type === "info" && "bg-blue-500"
                  )}
                  style={{ animationDuration: `${toast.duration}ms` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CONFIRMATION / DELETE DIALOG MODAL */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop with rich blur */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => handleConfirm(false)}
          />

          {/* Modal Box */}
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-neutral-200/80 transition-all animate-in zoom-in-95 duration-200 dark:bg-[#121214] dark:border-white/10">
            {/* Top Glowing Gradient Accent */}
            <div
              className={cn(
                "h-1.5 w-full",
                confirmDialog.options.variant === "danger"
                  ? "bg-gradient-to-r from-rose-500 via-red-500 to-rose-600"
                  : confirmDialog.options.variant === "warning"
                  ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500"
                  : "bg-gradient-to-r from-blue-500 to-indigo-600"
              )}
            />

            <div className="p-6 sm:p-7 text-center">
              {/* Pulsing Aura Badge Icon */}
              <div className="relative mx-auto mb-3 flex items-center justify-center">
                {confirmDialog.options.variant === "danger" ? (
                  <>
                    <div className="absolute h-20 w-20 rounded-full bg-rose-500/20 blur-xl dark:bg-rose-500/30 animate-pulse pointer-events-none" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-600 shadow-lg shadow-rose-500/15 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-400">
                      <Trash2 className="h-8 w-8 transition-transform hover:scale-110" />
                    </div>
                  </>
                ) : confirmDialog.options.variant === "warning" ? (
                  <>
                    <div className="absolute h-20 w-20 rounded-full bg-amber-500/20 blur-xl animate-pulse pointer-events-none" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 shadow-lg shadow-amber-500/15 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-400">
                      <AlertTriangle className="h-8 w-8" />
                    </div>
                  </>
                ) : (
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 shadow-lg shadow-blue-500/15 dark:bg-blue-950/40 dark:border-blue-500/30 dark:text-blue-400">
                    <HelpCircle className="h-8 w-8" />
                  </div>
                )}
              </div>

              {/* Dangerous Action Tag */}
              {confirmDialog.options.variant === "danger" && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60 mb-2">
                  <AlertOctagon className="h-3 w-3" />
                  <span>Tindakan Permanen</span>
                </div>
              )}

              {/* Title & Message */}
              <h3 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white sm:text-xl">
                {confirmDialog.options.title}
              </h3>
              <p className="mt-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed px-1">
                {confirmDialog.options.message}
              </p>

              {/* Item Preview Card (If Item Info is Available) */}
              {confirmDialog.options.itemName && (
                <div className="mt-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200/80 dark:border-white/10 p-3.5 text-left flex items-center justify-between gap-3 shadow-inner">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                      {confirmDialog.options.itemType || "Objek Terpilih"}
                    </p>
                    <p className="text-sm font-extrabold text-neutral-900 dark:text-white truncate">
                      {confirmDialog.options.itemName}
                    </p>
                    {confirmDialog.options.itemDetails && (
                      <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {confirmDialog.options.itemDetails}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-xl bg-rose-100 dark:bg-rose-950/60 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                    Akan Dihapus
                  </span>
                </div>
              )}

              {/* Warning Notice Callout */}
              {confirmDialog.options.warningNote && (
                <div className="mt-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 p-2.5 text-left flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200 leading-snug">
                    {confirmDialog.options.warningNote}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleConfirm(false)}
                  className="rounded-2xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-100 hover:bg-neutral-200/90 dark:bg-neutral-800/80 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold py-3 text-xs transition-all active:scale-95"
                >
                  {confirmDialog.options.cancelText || "Batalkan"}
                </button>

                <button
                  type="button"
                  onClick={() => handleConfirm(true)}
                  className={cn(
                    "rounded-2xl py-3 text-xs font-black text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2",
                    confirmDialog.options.variant === "danger"
                      ? "bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-rose-600/30 hover:shadow-rose-600/50"
                      : confirmDialog.options.variant === "warning"
                      ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/25"
                      : "bg-neutral-900 hover:bg-black dark:bg-white dark:text-neutral-900 shadow-neutral-900/20"
                  )}
                >
                  {confirmDialog.options.variant === "danger" && <Trash2 className="h-3.5 w-3.5" />}
                  <span>{confirmDialog.options.confirmText || (confirmDialog.options.variant === "danger" ? "Hapus Permanen" : "Lanjutkan")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ALERT DIALOG MODAL (REPLACES BROWSER alert()) */}
      {alertDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={handleAlertClose}
          />

          {/* Modal Box */}
          <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl bg-white shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-neutral-200/80 transition-all animate-in zoom-in-95 duration-200 dark:bg-[#121214] dark:border-white/10 text-center">
            {/* Top Colored Bar */}
            <div
              className={cn(
                "h-1.5 w-full",
                alertDialog.options.variant === "danger"
                  ? "bg-rose-500"
                  : alertDialog.options.variant === "warning"
                  ? "bg-amber-500"
                  : alertDialog.options.variant === "success"
                  ? "bg-emerald-500"
                  : "bg-blue-500"
              )}
            />

            <div className="p-6 sm:p-7">
              {/* Big Badge Icon */}
              <div
                className={cn(
                  "mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg",
                  alertDialog.options.variant === "danger"
                    ? "bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/40 dark:border-rose-500/30 dark:text-rose-400 shadow-rose-500/15"
                    : alertDialog.options.variant === "warning"
                    ? "bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-950/40 dark:border-amber-500/30 dark:text-amber-400 shadow-amber-500/15"
                    : alertDialog.options.variant === "success"
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-500/30 dark:text-emerald-400 shadow-emerald-500/15"
                    : "bg-blue-50 border border-blue-200 text-blue-600 dark:bg-blue-950/40 dark:border-blue-500/30 dark:text-blue-400 shadow-blue-500/15"
                )}
              >
                {alertDialog.options.variant === "danger" ? (
                  <AlertOctagon className="h-8 w-8" />
                ) : alertDialog.options.variant === "warning" ? (
                  <AlertTriangle className="h-8 w-8" />
                ) : alertDialog.options.variant === "success" ? (
                  <CheckCircle2 className="h-8 w-8" />
                ) : (
                  <Info className="h-8 w-8" />
                )}
              </div>

              {/* Title & Message */}
              <h3 className="text-lg font-black tracking-tight text-neutral-900 dark:text-white sm:text-xl">
                {alertDialog.options.title || "Pemberitahuan"}
              </h3>
              <p className="mt-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 leading-relaxed px-2">
                {alertDialog.options.message}
              </p>

              {/* Action Button */}
              <div className="mt-6 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleAlertClose}
                  className="w-full max-w-[220px] rounded-2xl bg-neutral-900 px-5 py-3 text-xs font-black text-white shadow-lg hover:bg-black dark:bg-white dark:text-neutral-900 transition-all active:scale-95"
                >
                  {alertDialog.options.buttonText || "Saya Mengerti"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
