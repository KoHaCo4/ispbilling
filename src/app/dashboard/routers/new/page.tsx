import { prisma } from "@/lib/prisma";
import { createRouter } from "../actions";

export default async function NewRouterPage() {
  const areas = await prisma.area.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-lg">
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Tambah Router Baru
      </h1>
      <p className="text-muted-sage text-sm mb-8">
        Daftarkan Mikrotik yang melayani sebuah area.
      </p>

      <form
        action={createRouter}
        className="space-y-4 bg-white border border-primary-text/10 p-6"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Nama Router
          </label>
          <input
            name="name"
            required
            placeholder="misal: BRAS-Desa-Sukamaju"
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Area / Desa
          </label>
          <select
            name="areaId"
            required
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
            <option value="">Pilih area</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
              IP Address
            </label>
            <input
              name="ipAddress"
              required
              placeholder="192.168.88.1"
              className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm font-mono focus:outline-none focus:border-ink-dark"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
              API Port
            </label>
            <input
              name="apiPort"
              type="number"
              defaultValue={8728}
              className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm font-mono focus:outline-none focus:border-ink-dark"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
              API Username
            </label>
            <input
              name="apiUsername"
              required
              defaultValue="admin"
              className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
              API Password
            </label>
            <input
              name="apiPassword"
              type="password"
              required
              className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-primary-text">
          <input type="checkbox" name="isMainBras" className="h-4 w-4" />
          Ini adalah router BRAS utama (autentikasi PPPoE utama)
        </label>

        <button
          type="submit"
          className="bg-ink-dark text-warm-paper text-sm font-medium px-6 py-3 hover:bg-opacity-90 transition-colors"
        >
          Simpan Router
        </button>
      </form>
    </div>
  );
}
