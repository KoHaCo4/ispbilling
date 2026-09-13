import { prisma } from "@/lib/prisma";

const actionStyle: Record<string, string> = {
  CUSTOMER_SUSPENDED: "bg-red-50 text-red-700 border-red-200",
  CUSTOMER_ACTIVE: "bg-green-50 text-green-700 border-green-200",
  PAYMENT_RECORDED: "bg-blue-50 text-blue-700 border-blue-200",
  ROUTER_CREATED: "bg-amber-50 text-amber-700 border-amber-200",
  ROUTER_UPDATED: "bg-amber-50 text-amber-700 border-amber-200",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string }>;
}) {
  const { entityType } = await searchParams;

  const logs = await prisma.auditLog.findMany({
    where: entityType ? { entityType } : undefined,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const filters = [
    { label: "Semua", value: undefined },
    { label: "Pelanggan", value: "Customer" },
    { label: "Invoice", value: "Invoice" },
    { label: "Router", value: "Router" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
          Audit Log
        </h1>
        <p className="text-muted-sage text-sm">
          Riwayat aktivitas sensitif di sistem - {logs.length} entri terbaru
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        {filters.map((f) => (
          <a
            key={f.label}
            href={
              f.value
                ? `/dashboard/audit?entityType=${f.value}`
                : "/dashboard/audit"
            }
            className={`text-xs px-3 py-1.5 border transition-colors ${
              entityType === f.value
                ? "bg-ink-dark text-warm-paper border-ink-dark"
                : "text-muted-sage border-muted-sage/30 hover:border-ink-dark"
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      <div className="bg-white border border-primary-text/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary-text/10 text-left text-xs uppercase tracking-wider text-muted-sage">
              <th className="px-4 py-3">Waktu</th>
              <th className="px-4 py-3">Aksi</th>
              <th className="px-4 py-3">Deskripsi</th>
              <th className="px-4 py-3">Pelaku</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr
                key={log.id}
                className="border-b border-primary-text/5 last:border-0 hover:bg-warm-paper/50"
              >
                <td className="px-4 py-3 text-xs text-muted-sage whitespace-nowrap">
                  {log.createdAt.toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 border rounded-sm whitespace-nowrap ${
                      actionStyle[log.action] ??
                      "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-primary-text">
                  {log.description}
                </td>
                <td className="px-4 py-3 text-muted-sage">
                  {log.user?.name ?? (
                    <span className="italic text-muted-sage/70">
                      Sistem (otomatis)
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-10 text-center text-muted-sage text-sm"
                >
                  Belum ada aktivitas tercatat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
