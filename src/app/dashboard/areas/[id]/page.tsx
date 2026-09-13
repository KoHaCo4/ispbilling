import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateArea } from "../actions";

export default async function EditAreaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [area, technicians] = await Promise.all([
    prisma.area.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { role: "TECHNICIAN", isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!area) {
    notFound();
  }

  const updateAreaWithId = updateArea.bind(null, id);

  return (
    <div className="max-w-lg">
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Edit Area
      </h1>
      <p className="text-muted-sage text-sm mb-8">{area.name}</p>

      <form
        action={updateAreaWithId}
        className="space-y-4 bg-white border border-primary-text/10 p-6"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Nama Desa
          </label>
          <input
            name="name"
            required
            defaultValue={area.name}
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
            defaultValue={area.district}
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
            defaultValue={area.regency}
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Teknisi Penanggung Jawab
          </label>
          <select
            name="technicianId"
            defaultValue={area.technicianId ?? ""}
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
          Simpan Perubahan
        </button>
      </form>
    </div>
  );
}
