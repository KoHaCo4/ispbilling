import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AreasPage() {
  const areas = await prisma.area.findMany({
    include: {
      technician: true,
      _count: { select: { customers: true, routers: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
            Area / Desa
          </h1>
          <p className="text-muted-sage text-sm">{areas.length} area layanan</p>
        </div>
        <Link
          href="/dashboard/areas/new"
          className="bg-ink-dark text-warm-paper text-sm font-medium px-4 py-2.5 hover:bg-opacity-90 transition-colors"
        >
          + Tambah Area
        </Link>
      </div>

      <div className="bg-white border border-primary-text/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-text/10 text-left text-xs uppercase tracking-wider text-muted-sage">
              <th className="px-4 py-3">Nama Desa</th>
              <th className="px-4 py-3">Kecamatan</th>
              <th className="px-4 py-3">Kabupaten</th>
              <th className="px-4 py-3">Teknisi</th>
              <th className="px-4 py-3">Router</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => (
              <tr
                key={area.id}
                className="border-b border-primary-text/5 last:border-0 hover:bg-warm-paper/50"
              >
                <td className="px-4 py-3 font-medium text-primary-text">
                  {area.name}
                </td>
                <td className="px-4 py-3 text-muted-sage">{area.district}</td>
                <td className="px-4 py-3 text-muted-sage">{area.regency}</td>
                <td className="px-4 py-3 text-muted-sage">
                  {area.technician?.name ?? "-"}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {area._count.routers}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {area._count.customers}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/areas/${area.id}`}
                    className="text-xs text-ink-dark hover:text-signal-amber underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}

            {areas.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-sage text-sm"
                >
                  Belum ada area.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
