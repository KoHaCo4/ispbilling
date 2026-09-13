"use client";

import { signOut } from "next-auth/react";

const roleLabel: Record<string, string> = {
  ADMIN: "Administrator Sistem",
  FINANCE: "Finance",
  TECHNICIAN: "Teknisi Lapangan",
  COLLECTOR: "Kolektor",
};

export default function Topbar({ name, role }: { name: string; role: string }) {
  return (
    <header className="h-16 bg-warm-paper border-b border-primary-text/10 flex items-center justify-between px-8 sticky top-0 z-10">
      <div>
        <p className="text-sm text-muted-sage">Selamat datang kembali,</p>
        <p className="font-archivo text-sm font-semibold text-primary-text">
          {name}
        </p>
      </div>

      <div className="flex items-center space-x-4">
        <span className="text-xs uppercase tracking-wider text-muted-sage border border-muted-sage/30 px-2.5 py-1 rounded-sm">
          {roleLabel[role] ?? role}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-primary-text hover:text-signal-amber transition-colors"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
