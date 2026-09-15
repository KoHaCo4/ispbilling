"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  roles: Array<"ADMIN" | "FINANCE" | "TECHNICIAN" | "COLLECTOR">;
};

const navItems: NavItem[] = [
  {
    label: "Ringkasan",
    href: "/dashboard",
    roles: ["ADMIN", "FINANCE", "TECHNICIAN", "COLLECTOR"],
  },
  {
    label: "Pelanggan",
    href: "/dashboard/customers",
    roles: ["ADMIN", "TECHNICIAN", "COLLECTOR"],
  },
  {
    label: "Tagihan & Pembayaran",
    href: "/dashboard/billing",
    roles: ["ADMIN", "FINANCE", "COLLECTOR"],
  },
  { label: "Paket Internet", href: "/dashboard/packages", roles: ["ADMIN"] },
  { label: "Area / Desa", href: "/dashboard/areas", roles: ["ADMIN"] },
  {
    label: "Router / Mikrotik",
    href: "/dashboard/routers",
    roles: ["ADMIN", "TECHNICIAN"],
  },
  {
    label: "Komplain Gangguan",
    href: "/dashboard/tickets",
    roles: ["ADMIN", "TECHNICIAN"],
  },
  { label: "Audit Log", href: "/dashboard/audit", roles: ["ADMIN"] },
];

export default function Sidebar({
  role,
  onNavigate,
}: {
  role: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) =>
    item.roles.includes(role as NavItem["roles"][number]),
  );

  return (
    <aside className="w-64 bg-ink-dark text-warm-paper flex flex-col shrink-0 h-screen md:sticky md:top-0">
      <div className="px-6 py-6 border-b border-muted-sage/20 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="w-2.5 h-2.5 bg-signal-amber rounded-full" />
          <span className="font-archivo tracking-wider text-sm font-semibold uppercase text-warm-paper/90">
            OPS-NET
          </span>
        </div>
        {/* Tombol tutup - cuma tampil di mobile */}
        <button
          onClick={onNavigate}
          className="md:hidden text-warm-paper/70 hover:text-warm-paper text-xl leading-none"
          aria-label="Tutup menu"
        >
          ✕
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`block px-3 py-2.5 text-sm rounded-sm transition-colors ${
                isActive
                  ? "bg-warm-paper/10 text-warm-paper font-medium"
                  : "text-muted-sage hover:bg-warm-paper/5 hover:text-warm-paper"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-muted-sage/20 text-xs text-muted-sage/70">
        <p>Node: ID-CJA-02</p>
      </div>
    </aside>
  );
}
