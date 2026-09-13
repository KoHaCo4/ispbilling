import { prisma } from "@/lib/prisma";
import { createTicket } from "../actions";

export default async function NewTicketPage() {
  const customers = await prisma.customer.findMany({
    where: { status: { in: ["ACTIVE", "SUSPENDED"] } },
    include: { area: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-lg">
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Buat Tiket Komplain
      </h1>
      <p className="text-muted-sage text-sm mb-8">
        Catat laporan gangguan dari pelanggan.
      </p>

      <form
        action={createTicket}
        className="space-y-4 bg-white border border-primary-text/10 p-6"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Pelanggan
          </label>
          <select
            name="customerId"
            required
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
            <option value="">Pilih pelanggan</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customerNumber} - {c.name} ({c.area.name})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Subjek
          </label>
          <input
            name="subject"
            required
            placeholder="misal: Internet putus-putus"
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Deskripsi
          </label>
          <textarea
            name="description"
            required
            rows={4}
            placeholder="Detail laporan dari pelanggan..."
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Prioritas
          </label>
          <select
            name="priority"
            defaultValue="MEDIUM"
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
            <option value="LOW">Rendah</option>
            <option value="MEDIUM">Sedang</option>
            <option value="HIGH">Tinggi</option>
            <option value="CRITICAL">Kritis</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-ink-dark text-warm-paper text-sm font-medium px-6 py-3 hover:bg-opacity-90 transition-colors"
        >
          Buat Tiket
        </button>
      </form>
    </div>
  );
}
