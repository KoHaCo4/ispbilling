import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { recordPayment } from "../actions";

const statusLabel: Record<string, string> = {
  PAID: "Lunas",
  UNPAID: "Belum Bayar",
  OVERDUE: "Jatuh Tempo",
  CANCELLED: "Dibatalkan",
};

const methodLabel: Record<string, string> = {
  TRANSFER: "Transfer Bank",
  VIRTUAL_ACCOUNT: "Virtual Account",
  QRIS: "QRIS",
  EWALLET: "E-Wallet",
  CASH: "Tunai",
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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: { include: { area: true } },
      package: true,
      payments: { orderBy: { paidAt: "desc" } },
    },
  });

  if (!invoice) {
    notFound();
  }

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = invoice.amount + invoice.lateFee - totalPaid;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="font-mono text-xs text-muted-sage mb-1">
          {invoice.invoiceNumber}
        </p>
        <h1 className="font-archivo text-2xl font-bold text-primary-text">
          Invoice {monthNames[invoice.periodMonth - 1]} {invoice.periodYear}
        </h1>
        <Link
          href={`/dashboard/customers/${invoice.customer.id}`}
          className="text-sm text-ink-dark hover:text-signal-amber underline"
        >
          {invoice.customer.name} - {invoice.customer.area.name}
        </Link>
      </div>

      <div className="bg-white border border-primary-text/10 p-5 mb-6">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-primary-text/10">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-sage mb-1">
              Status
            </p>
            <p className="font-archivo text-lg font-bold text-primary-text">
              {statusLabel[invoice.status]}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-muted-sage mb-1">
              Sisa Tagihan
            </p>
            <p className="font-archivo text-lg font-bold text-primary-text">
              Rp{Math.max(remaining, 0).toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-sage">Paket</dt>
            <dd className="text-primary-text">
              {invoice.package.name} ({invoice.package.speedMbps} Mbps)
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-sage">Tagihan Pokok</dt>
            <dd className="text-primary-text">
              Rp{invoice.amount.toLocaleString("id-ID")}
            </dd>
          </div>
          {invoice.lateFee > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-sage">Denda Keterlambatan</dt>
              <dd className="text-red-700">
                Rp{invoice.lateFee.toLocaleString("id-ID")}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-sage">Jatuh Tempo</dt>
            <dd className="text-primary-text">
              {invoice.dueDate.toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>

        {invoice.paymentUrl && invoice.status !== "PAID" && (
          <a
            href={invoice.paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 block text-center bg-signal-amber/10 border border-signal-amber/40 text-primary-text text-sm py-2.5 hover:bg-signal-amber/20 transition-colors"
          >
            Link Pembayaran Online →
          </a>
        )}
      </div>

      {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
        <div className="bg-white border border-primary-text/10 p-5 mb-6">
          <p className="text-xs uppercase tracking-wider text-muted-sage mb-4">
            Catat Pembayaran
          </p>
          <form action={recordPayment} className="space-y-4">
            <input type="hidden" name="invoiceId" value={invoice.id} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
                  Jumlah Dibayar
                </label>
                <input
                  name="amount"
                  type="number"
                  required
                  defaultValue={Math.max(remaining, 0)}
                  className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
                  Metode
                </label>
                <select
                  name="method"
                  defaultValue="CASH"
                  className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
                >
                  {Object.entries(methodLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
                No. Referensi (opsional)
              </label>
              <input
                name="referenceId"
                placeholder="misal: ID transaksi transfer"
                className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
              />
            </div>

            <button
              type="submit"
              className="bg-ink-dark text-warm-paper text-sm font-medium px-6 py-2.5 hover:bg-opacity-90 transition-colors"
            >
              Simpan Pembayaran
            </button>
          </form>
        </div>
      )}

      <div className="bg-white border border-primary-text/10 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-sage mb-3">
          Riwayat Pembayaran
        </p>
        {invoice.payments.length === 0 ? (
          <p className="text-sm text-muted-sage">
            Belum ada pembayaran tercatat.
          </p>
        ) : (
          <div className="space-y-2">
            {invoice.payments.map((p) => (
              <div
                key={p.id}
                className="flex justify-between text-sm py-2 border-b border-primary-text/5 last:border-0"
              >
                <span className="text-muted-sage">
                  {p.paidAt.toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-xs text-muted-sage">
                  {methodLabel[p.method]}
                  {p.referenceId ? ` - ${p.referenceId}` : ""}
                </span>
                <span className="text-primary-text font-medium">
                  Rp{p.amount.toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
