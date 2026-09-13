import { prisma } from "@/lib/prisma";
import Link from "next/link";

const statusStyle: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  RESOLVED: "bg-green-50 text-green-700 border-green-200",
  CLOSED: "bg-gray-100 text-gray-500 border-gray-200",
};

const statusLabel: Record<string, string> = {
  OPEN: "Terbuka",
  IN_PROGRESS: "Dikerjakan",
  RESOLVED: "Selesai",
  CLOSED: "Ditutup",
};

const priorityStyle: Record<string, string> = {
  LOW: "text-muted-sage",
  MEDIUM: "text-primary-text",
  HIGH: "text-orange-600 font-medium",
  CRITICAL: "text-red-700 font-semibold",
};

const priorityLabel: Record<string, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  CRITICAL: "Kritis",
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const tickets = await prisma.ticket.findMany({
    where: status
      ? { status: status as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" }
      : undefined,
    include: { customer: { include: { area: true } }, assignee: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const filters = [
    { label: "Semua", value: undefined },
    { label: "Terbuka", value: "OPEN" },
    { label: "Dikerjakan", value: "IN_PROGRESS" },
    { label: "Selesai", value: "RESOLVED" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
            Komplain Gangguan
          </h1>
          <p className="text-muted-sage text-sm">
            {tickets.length} tiket ditemukan
          </p>
        </div>
        <Link
          href="/dashboard/tickets/new"
          className="bg-ink-dark text-warm-paper text-sm font-medium px-4 py-2.5 hover:bg-opacity-90 transition-colors"
        >
          + Buat Tiket
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={
              f.value
                ? `/dashboard/tickets?status=${f.value}`
                : "/dashboard/tickets"
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
              <th className="px-4 py-3">Subjek</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Prioritas</th>
              <th className="px-4 py-3">Ditugaskan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr
                key={t.id}
                className="border-b border-primary-text/5 last:border-0 hover:bg-warm-paper/50"
              >
                <td className="px-4 py-3 font-medium text-primary-text max-w-xs truncate">
                  {t.subject}
                </td>
                <td className="px-4 py-3 text-muted-sage">{t.customer.name}</td>
                <td className="px-4 py-3 text-muted-sage">
                  {t.customer.area.name}
                </td>
                <td
                  className={`px-4 py-3 text-xs ${priorityStyle[t.priority]}`}
                >
                  {priorityLabel[t.priority]}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {t.assignee?.name ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 border rounded-sm ${statusStyle[t.status]}`}
                  >
                    {statusLabel[t.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/tickets/${t.id}`}
                    className="text-xs text-ink-dark hover:text-signal-amber underline"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            ))}

            {tickets.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-sage text-sm"
                >
                  Belum ada tiket komplain.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
