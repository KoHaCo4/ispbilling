import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { updatePackage } from "../actions";
import PackageForm from "../PackageForm";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [pkg, routers] = await Promise.all([
    prisma.package.findUnique({
      where: { id },
      include: { availableAtRouters: { select: { id: true } } },
    }),
    prisma.router.findMany({
      include: { area: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!pkg) {
    notFound();
  }

  const updatePackageWithId = updatePackage.bind(null, id);

  return (
    <div className="max-w-lg">
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Edit Paket
      </h1>
      <p className="text-muted-sage text-sm mb-8">{pkg.name}</p>

      <PackageForm
        action={updatePackageWithId}
        routers={routers.map((r) => ({
          id: r.id,
          name: r.name,
          areaName: r.area.name,
        }))}
        initialData={{
          id: pkg.id,
          name: pkg.name,
          speedMbps: pkg.speedMbps,
          price: pkg.price,
          mikrotikProfile: pkg.mikrotikProfile,
          isActive: pkg.isActive,
          availableAtRouterIds: pkg.availableAtRouters.map((r) => r.id),
        }}
      />
    </div>
  );
}
