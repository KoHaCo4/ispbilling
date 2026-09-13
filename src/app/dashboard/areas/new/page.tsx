import { prisma } from "@/lib/prisma";
import { createArea } from "../actions";

export default async function NewAreaPage() {
  const technicians = await prisma.user.findMany({
    where: { role: "TECHNICIAN", isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-lg">
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Tambah Area Baru
      </h1>
      <p className="text-muted-sage text-sm mb-8">
        Daftarkan desa/zona layanan baru.
      </p>

      <form
        action={createArea}
        className="space-y-4 bg-white border border-primary-text/10 p-6"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Nama Desa
          </label>
          <input
            name="name"
            required
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Kecamatan
          </label>
          <input
            name="district"
            required
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Kabupaten
          </label>
          <input
            name="regency"
            required
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Teknisi Penanggung Jawab (opsional)
          </label>
          <select
            name="technicianId"
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
            <option value="">Belum ditentukan</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="bg-ink-dark text-warm-paper text-sm font-medium px-6 py-3 hover:bg-opacity-90 transition-colors"
        >
          Simpan Area
        </button>
      </form>
    </div>
  );
}
