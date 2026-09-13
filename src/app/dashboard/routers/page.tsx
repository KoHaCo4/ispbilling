import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function RoutersPage() {
  const routers = await prisma.router.findMany({
    include: { area: true, _count: { select: { customers: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
            Router / Mikrotik
          </h1>
          <p className="text-muted-sage text-sm">
            {routers.length} router terdaftar
          </p>
        </div>
        <Link
          href="/dashboard/routers/new"
          className="bg-ink-dark text-warm-paper text-sm font-medium px-4 py-2.5 hover:bg-opacity-90 transition-colors"
        >
          + Tambah Router
        </Link>
      </div>

      <div className="bg-white border border-primary-text/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-text/10 text-left text-xs uppercase tracking-wider text-muted-sage">
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">IP Address</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {routers.map((router) => (
              <tr
                key={router.id}
                className="border-b border-primary-text/5 last:border-0 hover:bg-warm-paper/50"
              >
                <td className="px-4 py-3 font-medium text-primary-text">
                  {router.name}
                  {router.isMainBras && (
                    <span className="ml-2 text-[10px] uppercase text-signal-amber border border-signal-amber/40 px-1.5 py-0.5 rounded-sm">
                      Main BRAS
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {router.area.name}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-sage">
                  {router.ipAddress}:{router.apiPort}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {router._count.customers}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 border rounded-sm ${
                      router.isOnline
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {router.isOnline ? "Online" : "Belum dicek"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/routers/${router.id}`}
                    className="text-xs text-ink-dark hover:text-signal-amber underline"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            ))}

            {routers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-sage text-sm"
                >
                  Belum ada router.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
