"use client";

import { ChevronDown, Edit2, FileText, Phone, Trash2 } from "lucide-react";
import type { Lease, Room, Tenant } from "@/types";

export function TenantMobileList({ tenants, leases, rooms, loading, onEdit, onDelete, onPreviewId }: {
  tenants: Tenant[]; leases: Lease[]; rooms: Room[]; loading: boolean;
  onEdit: (tenant: Tenant) => void; onDelete: (tenant: Tenant) => void; onPreviewId: (url: string) => void;
}) {
  return <div className="space-y-3 sm:hidden">
    {!tenants.length && <p role="status" className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500 dark:border-white/10 dark:bg-[#18181B]">{loading ? "Memuat penghuni..." : "Tidak ada penghuni sesuai pencarian."}</p>}
    {tenants.map(tenant => {
      const lease = leases.find(row => row.tenant_id === tenant.id && row.status === "active");
      const room = rooms.find(row => row.tenant_id === tenant.id || row.current_tenant?.id === tenant.id);
      const roomNumber = lease?.room_number || room?.room_number;
      return <article key={tenant.id} className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4 shadow-spatial dark:border-white/10 dark:bg-[#18181B]">
        <h3 className="break-words text-base font-bold text-neutral-900 dark:text-white">{tenant.full_name}</h3>
        <p className="mt-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400">{roomNumber ? `Kamar ${roomNumber}` : "Tidak ada sewa aktif"}</p>
        <a href={`https://wa.me/${tenant.phone_number.replace("+", "")}`} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#D9FF43] px-3 text-sm font-semibold text-[#141610]"><Phone size={16} />{tenant.phone_number}</a>
        <details className="group mt-3 rounded-xl bg-neutral-50 p-3 text-xs dark:bg-neutral-900">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-semibold text-neutral-700 dark:text-neutral-300">Identitas & kontak darurat<ChevronDown size={16} className="shrink-0 transition-transform group-open:rotate-180" /></summary>
          <dl className="mt-2 space-y-3 break-words text-neutral-600 dark:text-neutral-400"><div><dt className="text-neutral-500">NIK</dt><dd className="mt-1 break-all">{tenant.id_card_number || "Belum diisi"}</dd></div><div><dt className="text-neutral-500">Kontak darurat</dt><dd className="mt-1">{tenant.emergency_contact_name || "Belum diisi"}{tenant.emergency_contact_name && <span className="mt-1 block">{tenant.emergency_contact_relation} · {tenant.emergency_contact_phone || "—"}</span>}</dd></div></dl>
          {tenant.id_card_url ? <button onClick={() => onPreviewId(tenant.id_card_url!)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 text-neutral-700 dark:border-white/10 dark:text-neutral-300"><FileText size={16} />Lihat KTP</button> : <p className="mt-3 text-neutral-500">KTP belum diunggah</p>}
        </details>
        <div className="mt-3 grid grid-cols-2 gap-2"><button aria-label={`Edit ${tenant.full_name}`} onClick={() => onEdit(tenant)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"><Edit2 size={14} />Edit</button><button aria-label={`Hapus ${tenant.full_name}`} onClick={() => onDelete(tenant)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"><Trash2 size={14} />Hapus</button></div>
      </article>;
    })}
  </div>;
}
