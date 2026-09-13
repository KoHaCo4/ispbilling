import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateCustomerStatus } from "../actions";

const statusLabel: Record<string, string> = {
  ACTIVE: "Aktif",
  SUSPENDED: "Isolir",
  PENDING: "Menunggu Instalasi",
  INACTIVE: "Berhenti",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      area: true,
      router: true,
      package: true,
      invoices: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  if (!customer) {
    notFound();
  }

  async function suspend() {
    "use server";
    await updateCustomerStatus(id, "SUSPENDED");
  }

  async function activate() {
    "use server";
    await updateCustomerStatus(id, "ACTIVE");
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-xs text-muted-sage mb-1">
            {customer.customerNumber}
          </p>
          <h1 className="font-archivo text-2xl font-bold text-primary-text">
            {customer.name}
          </h1>
        </div>

        <div className="flex gap-2">
          {customer.status !== "SUSPENDED" && (
            <form action={suspend}>
              <button
                type="submit"
                className="text-sm border border-red-300 text-red-700 px-4 py-2 hover:bg-red-50 transition-colors"
              >
                Isolir Pelanggan
              </button>
            </form>
          )}
          {customer.status !== "ACTIVE" && (
            <form action={activate}>
              <button
                type="submit"
                className="text-sm bg-ink-dark text-warm-paper px-4 py-2 hover:bg-opacity-90 transition-colors"
              >
                Aktifkan
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-primary-text/10 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-sage mb-3">
            Informasi Pelanggan
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-sage">Status</dt>
              <dd className="font-medium text-primary-text">
                {statusLabel[customer.status]}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-sage">No. HP</dt>
              <dd className="text-primary-text">{customer.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-sage">Email</dt>
              <dd className="text-primary-text">{customer.email ?? "-"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-sage">Alamat</dt>
              <dd className="text-primary-text text-right max-w-[60%]">
                {customer.address}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-primary-text/10 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-sage mb-3">
            Informasi Jaringan
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-sage">Area</dt>
              <dd className="text-primary-text">{customer.area.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-sage">Router</dt>
              <dd className="text-primary-text">{customer.router.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-sage">Paket</dt>
              <dd className="text-primary-text">
                {customer.package.name} ({customer.package.speedMbps} Mbps)
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-sage">PPPoE Username</dt>
              <dd className="font-mono text-xs text-primary-text">
                {customer.pppoeUsername ?? "-"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="bg-white border border-primary-text/10 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-sage mb-3">
          Invoice Terakhir
        </p>
        {customer.invoices.length === 0 ? (
          <p className="text-sm text-muted-sage">Belum ada invoice.</p>
        ) : (
          <div className="space-y-2">
            {customer.invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex justify-between text-sm py-2 border-b border-primary-text/5 last:border-0"
              >
                <span className="text-muted-sage">
                  {inv.periodMonth}/{inv.periodYear}
                </span>
                <span className="text-primary-text">
                  Rp{inv.amount.toLocaleString("id-ID")}
                </span>
                <span className="text-xs text-muted-sage">{inv.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
