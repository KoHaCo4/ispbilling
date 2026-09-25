import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { generateMonthlyInvoices, markOverdueInvoices } from "./actions";
import BillingGenerationGuard from "./BillingGenerationGuard";

const statusStyle: Record<string, string> = {
  PAID: "bg-green-50 text-green-700 border-green-200",
  UNPAID: "bg-amber-50 text-amber-700 border-amber-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
};

const statusLabel: Record<string, string> = {
  PAID: "Lunas",
  UNPAID: "Belum Bayar",
  OVERDUE: "Jatuh Tempo",
  CANCELLED: "Dibatalkan",
};

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const now = new Date();

  const invoices = await prisma.invoice.findMany({
    where: status
      ? { status: status as "PAID" | "UNPAID" | "OVERDUE" | "CANCELLED" }
      : undefined,
    include: { customer: { include: { area: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const filters = [
    { label: "Semua", value: undefined },
    { label: "Belum Bayar", value: "UNPAID" },
    { label: "Jatuh Tempo", value: "OVERDUE" },
    { label: "Lunas", value: "PAID" },
  ];

  async function generateThisMonth() {
    "use server";
    await generateMonthlyInvoices(now.getMonth() + 1, now.getFullYear());
  }

  async function checkOverdue() {
    "use server";
    await markOverdueInvoices();
  }

  return (
    <BillingGenerationGuard>
      <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
            Tagihan & Pembayaran
          </h1>
          <p className="text-muted-sage text-sm">
            {invoices.length} invoice ditemukan
          </p>
        </div>
        <div className="flex gap-2">
          <form action={checkOverdue}>
            <button
              type="submit"
              className="text-sm border border-muted-sage/40 text-primary-text px-4 py-2.5 hover:border-ink-dark transition-colors"
            >
              Cek Jatuh Tempo
            </button>
          </form>
          <form action={generateThisMonth}>
            <button
              type="submit"
              className="bg-ink-dark text-warm-paper text-sm font-medium px-4 py-2.5 hover:bg-opacity-90 transition-colors"
            >
              Generate Invoice {monthNames[now.getMonth()]} {now.getFullYear()}
            </button>
          </form>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={
              f.value
                ? `/dashboard/billing?status=${f.value}`
                : "/dashboard/billing"
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
              <th className="px-4 py-3">No. Invoice</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Periode</th>
              <th className="px-4 py-3">Jumlah</th>
              <th className="px-4 py-3">Jatuh Tempo</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-primary-text/5 last:border-0 hover:bg-warm-paper/50"
              >
                <td className="px-4 py-3 font-mono text-xs text-muted-sage">
                  {inv.invoiceNumber}
                </td>
                <td className="px-4 py-3 font-medium text-primary-text">
                  {inv.customer.name}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {inv.customer.area.name}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {monthNames[inv.periodMonth - 1]} {inv.periodYear}
                </td>
                <td className="px-4 py-3 text-primary-text">
                  Rp{inv.amount.toLocaleString("id-ID")}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {inv.dueDate.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 border rounded-sm ${statusStyle[inv.status]}`}
                  >
                    {statusLabel[inv.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/billing/${inv.id}`}
                    className="text-xs text-ink-dark hover:text-signal-amber underline"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            ))}

            {invoices.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-muted-sage text-sm"
                >
                  Belum ada invoice. Klik &quot;Generate Invoice&quot; untuk
                  membuat tagihan bulan ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      </div>
    </BillingGenerationGuard>
  );
}
