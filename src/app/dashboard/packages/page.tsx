import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function PackagesPage() {
  const packages = await prisma.package.findMany({
    include: { _count: { select: { customers: true } } },
    orderBy: { price: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
            Paket Internet
          </h1>
          <p className="text-muted-sage text-sm">
            {packages.length} paket terdaftar
          </p>
        </div>
        <Link
          href="/dashboard/packages/new"
          className="bg-ink-dark text-warm-paper text-sm font-medium px-4 py-2.5 hover:bg-opacity-90 transition-colors"
        >
          + Tambah Paket
        </Link>
      </div>

      <div className="bg-white border border-primary-text/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-text/10 text-left text-xs uppercase tracking-wider text-muted-sage">
              <th className="px-4 py-3">Nama Paket</th>
              <th className="px-4 py-3">Speed</th>
              <th className="px-4 py-3">Harga</th>
              <th className="px-4 py-3">Profile Mikrotik</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr
                key={p.id}
                className="border-b border-primary-text/5 last:border-0 hover:bg-warm-paper/50"
              >
                <td className="px-4 py-3 font-medium text-primary-text">
                  {p.name}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {p.speedMbps} Mbps
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  Rp{p.price.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-sage">
                  {p.mikrotikProfile ?? (
                    <span className="italic text-muted-sage/70">
                      auto-generate
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {p._count.customers}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 border rounded-sm ${
                      p.isActive
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {p.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/packages/${p.id}`}
                    className="text-xs text-ink-dark hover:text-signal-amber underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
