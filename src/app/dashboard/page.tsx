import { prisma } from "@/lib/prisma";
import Link from "next/link";
import RevenueChart from "@/components/dashboard/RevenueChart";

const monthNamesShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const ticketStatusLabel: Record<string, string> = {
  OPEN: "Terbuka",
  IN_PROGRESS: "Dikerjakan",
  RESOLVED: "Selesai",
  CLOSED: "Ditutup",
};

export default async function DashboardOverviewPage() {
  const now = new Date();

  const [
    totalCustomers,
    activeCustomers,
    suspendedCustomers,
    unpaidInvoices,
    openTickets,
    routers,
    recentTickets,
    priorityInvoices,
    payments,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { status: "ACTIVE" } }),
    prisma.customer.count({ where: { status: "SUSPENDED" } }),
    prisma.invoice.count({ where: { status: { in: ["UNPAID", "OVERDUE"] } } }),
    prisma.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.router.findMany(),
    prisma.ticket.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { customer: { include: { area: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.invoice.findMany({
      where: { status: { in: ["UNPAID", "OVERDUE"] } },
      include: { customer: { include: { area: true } } },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    // Ambil pembayaran 6 bulan terakhir untuk dihitung jadi grafik
    prisma.payment.findMany({
      where: {
        paidAt: {
          gte: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        },
      },
      select: { amount: true, paidAt: true },
    }),
  ]);

  const stats = [
    { label: "Total Pelanggan", value: totalCustomers },
    { label: "Pelanggan Aktif", value: activeCustomers },
    { label: "Pelanggan Isolir", value: suspendedCustomers },
    { label: "Tagihan Belum Lunas", value: unpaidInvoices },
    { label: "Tiket Terbuka", value: openTickets },
  ];

  // Hitung pendapatan per bulan untuk 6 bulan terakhir
  const revenueByMonth: { month: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = monthNamesShort[targetDate.getMonth()];
    const total = payments
      .filter(
        (p) =>
          p.paidAt.getFullYear() === targetDate.getFullYear() &&
          p.paidAt.getMonth() === targetDate.getMonth(),
      )
      .reduce((sum, p) => sum + p.amount, 0);
    revenueByMonth.push({ month: monthLabel, revenue: total });
  }

  const onlineRouters = routers.filter((r) => r.isOnline).length;

  return (
    <div>
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Ringkasan Operasional
      </h1>
      <p className="text-muted-sage text-sm mb-8">
        Kondisi jaringan dan pelanggan per hari ini.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-primary-text/10 p-5"
          >
            <p className="text-xs uppercase tracking-wider text-muted-sage mb-2">
              {stat.label}
            </p>
            <p className="font-archivo text-3xl font-bold text-primary-text">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-white border border-primary-text/10 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-sage mb-4">
            Pendapatan 6 Bulan Terakhir
          </p>
          <RevenueChart data={revenueByMonth} />
        </div>

        <div className="bg-white border border-primary-text/10 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-sage mb-4">
            Status Router
          </p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="font-archivo text-3xl font-bold text-primary-text">
              {onlineRouters}
            </span>
            <span className="text-sm text-muted-sage">
              / {routers.length} online
            </span>
          </div>
          <div className="space-y-2">
            {routers.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-primary-text truncate">{r.name}</span>
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    r.isOnline ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/routers"
            className="block text-xs text-ink-dark hover:text-signal-amber underline mt-4"
          >
            Lihat semua router
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-primary-text/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider text-muted-sage">
              Tiket Perlu Perhatian
            </p>
            <Link
              href="/dashboard/tickets"
              className="text-xs text-ink-dark hover:text-signal-amber underline"
            >
              Lihat semua
            </Link>
          </div>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-muted-sage">Tidak ada tiket terbuka.</p>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((t) => (
                <Link
                  key={t.id}
                  href={`/dashboard/tickets/${t.id}`}
                  className="block border-b border-primary-text/5 last:border-0 pb-3 last:pb-0 hover:bg-warm-paper/50 -mx-1 px-1"
                >
                  <p className="text-sm font-medium text-primary-text truncate">
                    {t.subject}
                  </p>
                  <p className="text-xs text-muted-sage">
                    {t.customer.name} - {t.customer.area.name} ·{" "}
                    {ticketStatusLabel[t.status]}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-primary-text/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs uppercase tracking-wider text-muted-sage">
              Tagihan Perlu Ditagih
            </p>
            <Link
              href="/dashboard/billing"
              className="text-xs text-ink-dark hover:text-signal-amber underline"
            >
              Lihat semua
            </Link>
          </div>
          {priorityInvoices.length === 0 ? (
            <p className="text-sm text-muted-sage">Semua tagihan lunas.</p>
          ) : (
            <div className="space-y-3">
              {priorityInvoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/dashboard/billing/${inv.id}`}
                  className="flex items-center justify-between border-b border-primary-text/5 last:border-0 pb-3 last:pb-0 hover:bg-warm-paper/50 -mx-1 px-1"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-primary-text truncate">
                      {inv.customer.name}
                    </p>
                    <p className="text-xs text-muted-sage">
                      {inv.customer.area.name} · Jatuh tempo{" "}
                      {inv.dueDate.toLocaleDateString("id-ID", {
                        dateStyle: "medium",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs shrink-0 ml-2 ${
                      inv.status === "OVERDUE"
                        ? "text-red-700 font-medium"
                        : "text-muted-sage"
                    }`}
                  >
                    Rp{inv.amount.toLocaleString("id-ID")}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
