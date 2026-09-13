import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updateRouter } from "../actions";
import TestConnectionButton from "../TestConnectionButton";
import SyncPackagesButton from "../SyncPackagesButton";

export default async function EditRouterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [router, areas] = await Promise.all([
    prisma.router.findUnique({ where: { id } }),
    prisma.area.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!router) {
    notFound();
  }

  const updateRouterWithId = updateRouter.bind(null, id);

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-archivo text-2xl font-bold text-primary-text">
          Edit Router
        </h1>
        <span
          className={`text-xs px-2 py-1 border rounded-sm ${
            router.isOnline
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-100 text-gray-500 border-gray-200"
          }`}
        >
          {router.isOnline ? "Online" : "Belum dicek / Offline"}
        </span>
      </div>
      <p className="text-muted-sage text-sm mb-2">{router.name}</p>
      {router.lastSeenAt && (
        <p className="text-xs text-muted-sage mb-6">
          Terakhir online:{" "}
          {router.lastSeenAt.toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      )}

      <TestConnectionButton routerId={router.id} />
      <SyncPackagesButton routerId={router.id} />
      <a
        href={`/dashboard/packages/import/${router.id}`}
        className="inline-block text-sm border border-muted-sage/40 text-primary-text px-4 py-2.5 hover:border-ink-dark transition-colors mb-4"
      >
        Import Paket dari Router Ini →
      </a>

      <form
        action={updateRouterWithId}
        className="space-y-4 bg-white border border-primary-text/10 p-6"
      >
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
            Nama Router
          </label>
          <input
            name="name"
            required
            defaultValue={router.name}
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
            defaultValue={router.areaId}
            className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark bg-white"
          >
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
              defaultValue={router.ipAddress}
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
              defaultValue={router.apiPort}
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
              defaultValue={router.apiUsername}
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
              placeholder="Kosongkan jika tidak ingin mengubah password"
              className="w-full px-3.5 py-2.5 border border-muted-sage/40 text-sm focus:outline-none focus:border-ink-dark"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-primary-text">
          <input
            type="checkbox"
            name="isMainBras"
            defaultChecked={router.isMainBras}
            className="h-4 w-4"
          />
          Ini adalah router BRAS utama (autentikasi PPPoE utama)
        </label>

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
