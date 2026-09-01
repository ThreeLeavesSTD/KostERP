"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Plus,
  Search,
  Copy,
  Check,
  Send,
  Coins,
  TrendingUp,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { ElectricityTransaction } from "@/types";
import { KostStorage } from "@/lib/storage";
import {
  formatRupiah,
  formatDateIndo,
  formatTokenPLN,
  getTokenPaymentStatusInfo,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TokenPurchaseModal } from "./token-purchase-modal";
import { TokenDispatchDialog } from "./token-dispatch-dialog";

export function ElectricityView() {
  const [transactions, setTransactions] = useState<ElectricityTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedTxForDispatch, setSelectedTxForDispatch] =
    useState<ElectricityTransaction | null>(null);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  const loadData = () => {
    setTransactions(KostStorage.getElectricityTransactions());
  };

  useEffect(() => {
    loadData();
    const handleStorageChange = () => loadData();
    window.addEventListener("kost_storage_change", handleStorageChange);
    return () => window.removeEventListener("kost_storage_change", handleStorageChange);
  }, []);

  const filtered = transactions.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesRoom = t.room_number?.toLowerCase().includes(q);
    const matchesTenant = t.tenant_name?.toLowerCase().includes(q);
    const matchesToken = t.token_code.includes(q);
    return matchesRoom || matchesTenant || matchesToken;
  });

  // Analytics
  const totalVolume = transactions.reduce((s, t) => s + t.selling_price, 0);
  const totalProfit = transactions.reduce((s, t) => s + (t.profit_margin || 0), 0);
  const totalTokens = transactions.length;

  const handleCopySingleToken = (id: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              Distribusi Token Listrik PLN
            </h2>
            <span className="rounded-full bg-[#D9FF43] px-2.5 py-0.5 text-xs font-bold text-[#0A0A0A]">
              Margin +{formatRupiah(totalProfit)}
            </span>
          </div>
          <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manajemen 20 digit kode token PLN, laba penjualan otomatis, dan webhook n8n broadcast ke WhatsApp.
          </p>
        </div>

        <Button
          onClick={() => setIsPurchaseModalOpen(true)}
          variant="lime"
          className="gap-2 shadow-spatial text-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Input Token PLN</span>
        </Button>
      </div>

      {/* Bento Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-spatial dark:bg-[#18181B] dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Transaksi</span>
            <div className="rounded-2xl bg-neutral-100 p-2.5 text-neutral-900 dark:bg-neutral-800 dark:text-white">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            {totalTokens} <span className="text-sm font-normal text-neutral-400">Unit</span>
          </p>
          <p className="mt-1 text-[11px] font-medium text-neutral-500">Distribusi token ke penghuni</p>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-spatial dark:bg-[#18181B] dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Omzet Penjualan</span>
            <div className="rounded-2xl bg-neutral-100 p-2.5 text-neutral-900 dark:bg-neutral-800 dark:text-white">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
            {formatRupiah(totalVolume)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-neutral-500">Total akumulasi harga jual</p>
        </div>

        <div className="rounded-3xl border border-neutral-800 bg-[#0A0A0A] p-5 shadow-spatial text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Laba Bersih Kost
            </span>
            <div className="rounded-2xl bg-[#D9FF43] p-2.5 text-[#0A0A0A]">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-3 text-2xl font-black tracking-tight text-[#D9FF43]">
            +{formatRupiah(totalProfit)}
          </p>
          <p className="mt-1 text-[11px] font-medium text-neutral-400">
            Margin keuntungan bersih token
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          placeholder="Cari transaksi berdasarkan nomor kamar, nama penghuni, atau kode token..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-white/80 bg-white py-3 pl-11 pr-4 text-xs font-medium shadow-spatial focus:ring-2 focus:ring-[#0A0A0A] focus:outline-none dark:bg-[#18181B] dark:border-white/10 dark:text-white"
        />
      </div>

      {/* Transactions Table */}
      <div className="overflow-hidden rounded-3xl border border-white/80 bg-white shadow-spatial dark:bg-[#18181B] dark:border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-100 bg-neutral-50/80 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:bg-neutral-800/60 dark:border-white/10">
              <tr>
                <th className="px-5 py-4">Kamar & Penghuni</th>
                <th className="px-5 py-4">20 Digit Kode Token PLN</th>
                <th className="px-5 py-4">Nominal / kWh</th>
                <th className="px-5 py-4">Harga Beli / Jual</th>
                <th className="px-5 py-4">Laba (Margin)</th>
                <th className="px-5 py-4">Status Bayar</th>
                <th className="px-5 py-4 text-right">Dispatch WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-neutral-400">
                    Belum ada transaksi token listrik tercatat.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const paymentInfo = getTokenPaymentStatusInfo(tx.payment_status);
                  return (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-neutral-50/70 dark:hover:bg-neutral-800/40"
                    >
                      {/* Room & Tenant */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-neutral-900 dark:text-white text-sm">
                            Kamar {tx.room_number}
                          </span>
                        </div>
                        <p className="font-bold text-neutral-700 dark:text-neutral-300">
                          {tx.tenant_name}
                        </p>
                        <p className="text-[10px] font-medium text-neutral-400">
                          {formatDateIndo(tx.created_at)}
                        </p>
                      </td>

                      {/* 20 Digit Token Code */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 font-mono">
                          <span className="rounded-xl bg-neutral-100 px-3 py-1.5 text-xs font-extrabold text-neutral-900 tracking-wider dark:bg-neutral-800 dark:text-white">
                            {formatTokenPLN(tx.token_code)}
                          </span>
                          <button
                            onClick={() =>
                              handleCopySingleToken(tx.id, tx.token_code)
                            }
                            title="Salin Kode Token"
                            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                          >
                            {copiedTokenId === tx.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Nominal */}
                      <td className="px-5 py-4">
                        <p className="font-extrabold text-neutral-900 dark:text-white">
                          {formatRupiah(tx.nominal_amount)}
                        </p>
                        {tx.kwh_units && (
                          <p className="text-[11px] font-medium text-neutral-500">
                            ~{tx.kwh_units} kWh
                          </p>
                        )}
                      </td>

                      {/* Cost vs Selling */}
                      <td className="px-5 py-4">
                        <p className="text-[11px] font-medium text-neutral-400">
                          Beli: {formatRupiah(tx.cost_price)}
                        </p>
                        <p className="font-bold text-neutral-800 dark:text-neutral-200">
                          Jual: {formatRupiah(tx.selling_price)}
                        </p>
                      </td>

                      {/* Profit */}
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[#D9FF43]/30 px-3 py-1 text-xs font-black text-neutral-900 dark:text-[#D9FF43]">
                          +{formatRupiah(tx.profit_margin)}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-0.5 text-[10px] font-extrabold ${paymentInfo.color}`}
                        >
                          {paymentInfo.label}
                        </span>
                      </td>

                      {/* WhatsApp Dispatch Button */}
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          variant={tx.sent_at ? "outline" : "lime"}
                          onClick={() => setSelectedTxForDispatch(tx)}
                          className="h-8 gap-1.5 text-xs font-bold"
                        >
                          <Send className="h-3 w-3" />
                          <span>{tx.sent_at ? "Kirim Ulang WA" : "Kirim WA ⚡"}</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <TokenPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onSuccess={(txId) => {
          loadData();
          if (txId) {
            const newlyCreated = KostStorage.getElectricityTransactions().find(
              (t) => t.id === txId
            );
            if (newlyCreated) {
              setSelectedTxForDispatch(newlyCreated);
            }
          }
        }}
      />

      <TokenDispatchDialog
        isOpen={!!selectedTxForDispatch}
        onClose={() => setSelectedTxForDispatch(null)}
        transaction={selectedTxForDispatch}
        onSentSuccess={loadData}
      />
    </div>
  );
}
