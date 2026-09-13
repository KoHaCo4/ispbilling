import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { updateTicketStatus, assignTicket } from "../actions";

const statusLabel: Record<string, string> = {
  OPEN: "Terbuka",
  IN_PROGRESS: "Dikerjakan",
  RESOLVED: "Selesai",
  CLOSED: "Ditutup",
};

const priorityLabel: Record<string, string> = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  CRITICAL: "Kritis",
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [ticket, technicians] = await Promise.all([
    prisma.ticket.findUnique({
      where: { id },
      include: { customer: { include: { area: true } }, assignee: true },
    }),
    prisma.user.findMany({
      where: { role: "TECHNICIAN", isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!ticket) {
    notFound();
  }

  async function setStatus(
    status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
  ) {
    "use server";
    await updateTicketStatus(id, status);
  }

  async function assign(formData: FormData) {
    "use server";
    const assigneeId = formData.get("assigneeId") as string;
    await assignTicket(id, assigneeId);
  }

  const statusFlow: Array<"OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"> = [
    "OPEN",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
  ];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <p className="text-xs text-muted-sage mb-1">
          Dibuat{" "}
          {ticket.createdAt.toLocaleDateString("id-ID", {
            dateStyle: "medium",
          })}
        </p>
        <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
          {ticket.subject}
        </h1>
        <Link
          href={`/dashboard/customers/${ticket.customer.id}`}
          className="text-sm text-ink-dark hover:text-signal-amber underline"
        >
          {ticket.customer.name} - {ticket.customer.area.name}
        </Link>
      </div>

      <div className="bg-white border border-primary-text/10 p-5 mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-sage mb-2">
          Deskripsi
        </p>
        <p className="text-sm text-primary-text whitespace-pre-wrap">
          {ticket.description}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-primary-text/10 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-sage mb-3">
            Status
          </p>
          <p className="font-archivo text-lg font-bold text-primary-text mb-3">
            {statusLabel[ticket.status]}
          </p>
          <div className="flex flex-wrap gap-2">
            {statusFlow
              .filter((s) => s !== ticket.status)
              .map((s) => (
                <form key={s} action={setStatus.bind(null, s)}>
                  <button
                    type="submit"
                    className="text-xs border border-muted-sage/40 text-primary-text px-3 py-1.5 hover:border-ink-dark transition-colors"
                  >
                    Ubah ke &quot;{statusLabel[s]}&quot;
                  </button>
                </form>
              ))}
          </div>
        </div>

        <div className="bg-white border border-primary-text/10 p-5">
          <p className="text-xs uppercase tracking-wider text-muted-sage mb-3">
            Prioritas
          </p>
          <p className="font-archivo text-lg font-bold text-primary-text">
            {priorityLabel[ticket.priority]}
          </p>
        </div>
      </div>

      <div className="bg-white border border-primary-text/10 p-5">
        <p className="text-xs uppercase tracking-wider text-muted-sage mb-3">
          Teknisi Ditugaskan
        </p>
        <form action={assign} className="flex gap-2">
          <select
            name="assigneeId"
            defaultValue={ticket.assigneeId ?? ""}
            className="flex-1 px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
            <option value="">Belum ditugaskan</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-ink-dark text-warm-paper text-sm font-medium px-4 py-2.5 hover:bg-opacity-90 transition-colors"
          >
            Simpan
          </button>
        </form>
      </div>
    </div>
  );
}
