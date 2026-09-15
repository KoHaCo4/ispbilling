"use client";

import { signOut } from "next-auth/react";

const roleLabel: Record<string, string> = {
  ADMIN: "Administrator Sistem",
  FINANCE: "Finance",
  TECHNICIAN: "Teknisi Lapangan",
  COLLECTOR: "Kolektor",
};

export default function Topbar({
  name,
  role,
  onMenuClick,
}: {
  name: string;
  role: string;
  onMenuClick?: () => void;
}) {
  return (
    <header className="h-16 bg-warm-paper border-b border-primary-text/10 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {/* Tombol hamburger - cuma tampil di mobile */}
        <button
          onClick={onMenuClick}
          className="md:hidden shrink-0 text-primary-text p-1 -ml-1"
          aria-label="Buka menu"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-muted-sage truncate">
            Selamat datang kembali,
          </p>
          <p className="font-archivo text-sm font-semibold text-primary-text truncate">
            {name}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <span className="hidden sm:inline text-xs uppercase tracking-wider text-muted-sage border border-muted-sage/30 px-2.5 py-1 rounded-sm">
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
