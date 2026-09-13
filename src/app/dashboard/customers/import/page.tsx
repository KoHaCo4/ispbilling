import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ImportCustomersPage() {
  const routers = await prisma.router.findMany({ include: { area: true } });

  return (
    <div className="max-w-lg">
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Import Pelanggan dari Mikrotik
      </h1>
      <p className="text-muted-sage text-sm mb-8">
        Tarik daftar PPPoE secret yang sudah ada di router, untuk didaftarkan ke
        sistem billing tanpa input ulang dari nol.
      </p>

      <div className="bg-white border border-primary-text/10 p-6">
        <p className="text-xs uppercase tracking-wider text-muted-sage mb-3">
          Pilih Router
        </p>
        <div className="space-y-2">
          {routers.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/customers/import/${r.id}`}
              className="block border border-muted-sage/30 px-4 py-3 hover:border-ink-dark transition-colors"
            >
              <p className="text-sm font-medium text-primary-text">{r.name}</p>
              <p className="text-xs text-muted-sage">
                {r.area.name} · {r.ipAddress}
              </p>
            </Link>
          ))}

          {routers.length === 0 && (
            <p className="text-sm text-muted-sage">
              Belum ada router terdaftar. Tambahkan router dulu di menu Router.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
