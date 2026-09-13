import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusStyle: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700 border-green-200",
  SUSPENDED: "bg-red-50 text-red-700 border-red-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  INACTIVE: "bg-gray-100 text-gray-500 border-gray-200",
};

const statusLabel: Record<string, string> = {
  ACTIVE: "Aktif",
  SUSPENDED: "Isolir",
  PENDING: "Menunggu Instalasi",
  INACTIVE: "Berhenti",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const customers = await prisma.customer.findMany({
    where: status
      ? { status: status as "ACTIVE" | "SUSPENDED" | "PENDING" | "INACTIVE" }
      : undefined,
    include: { area: true, package: true },
    orderBy: { createdAt: "desc" },
  });

  const filters = [
    { label: "Semua", value: undefined },
    { label: "Aktif", value: "ACTIVE" },
    { label: "Isolir", value: "SUSPENDED" },
    { label: "Menunggu", value: "PENDING" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
            Pelanggan
          </h1>
          <p className="text-muted-sage text-sm">
            {customers.length} pelanggan ditemukan
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/customers/import"
            className="border border-muted-sage/40 text-primary-text text-sm font-medium px-4 py-2.5 hover:border-ink-dark transition-colors"
          >
            Import dari Mikrotik
          </Link>
          <Link
            href="/dashboard/customers/new"
            className="bg-ink-dark text-warm-paper text-sm font-medium px-4 py-2.5 hover:bg-opacity-90 transition-colors"
          >
            + Tambah Pelanggan
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={
              f.value
                ? `/dashboard/customers?status=${f.value}`
                : "/dashboard/customers"
            }
            className={`text-xs px-3 py-1.5 border transition-colors ${
              status === f.value
                ? "bg-ink-dark text-warm-paper border-ink-dark"
                : "text-muted-sage border-muted-sage/30 hover:border-ink-dark"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="bg-white border border-primary-text/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-text/10 text-left text-xs uppercase tracking-wider text-muted-sage">
              <th className="px-4 py-3">No. Pelanggan</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Paket</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.id}
                className="border-b border-primary-text/5 last:border-0 hover:bg-warm-paper/50"
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-sage">
                  {c.customerNumber}
                </td>
                <td className="px-4 py-3 font-medium text-primary-text">
                  {c.name}
                </td>
                <td className="px-4 py-3 text-muted-sage">{c.area.name}</td>
                <td className="px-4 py-3 text-muted-sage">{c.package.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 border rounded-sm ${statusStyle[c.status]}`}
                  >
                    {statusLabel[c.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/customers/${c.id}`}
                    className="text-xs text-ink-dark hover:text-signal-amber underline"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            ))}

            {customers.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-muted-sage text-sm"
                >
                  Belum ada pelanggan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
