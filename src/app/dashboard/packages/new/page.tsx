import { prisma } from "@/lib/prisma";
import { createPackage } from "../actions";
import PackageForm from "../PackageForm";

export default async function NewPackagePage() {
  const routers = await prisma.router.findMany({
    include: { area: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-lg">
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Tambah Paket Baru
      </h1>
      <p className="text-muted-sage text-sm mb-8">
        Paket internet yang bisa dipilih saat mendaftarkan pelanggan.
      </p>

      <PackageForm
        action={createPackage}
        routers={routers.map((r) => ({
          id: r.id,
          name: r.name,
          areaName: r.area.name,
        }))}
      />
    </div>
  );
}
