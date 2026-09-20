import { prisma } from "@/lib/prisma";
import { createCustomer, generateCustomerNumber } from "../actions";
import CustomerForm from "../CustomerForm";

export default async function NewCustomerPage() {
  const [areas, routers, packages, suggestedCustomerNumber] = await Promise.all(
    [
      prisma.area.findMany({ orderBy: { name: "asc" } }),
      prisma.router.findMany({ orderBy: { name: "asc" } }),
      prisma.package.findMany({
        where: { isActive: true },
        include: { availableAtRouters: { select: { id: true } } },
        orderBy: { price: "asc" },
      }),
      generateCustomerNumber(),
    ],
  );

  const suggestUsername = suggestedCustomerNumber
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return (
    <div className="max-w-2xl">
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Tambah Pelanggan Baru
      </h1>
      <p className="text-muted-sage text-sm mb-8">
        Data ini akan tersimpan dengan status &quot;Menunggu Instalasi&quot;.
      </p>

      <CustomerForm
        action={createCustomer}
        areas={areas}
        routers={routers.map((r) => ({
          id: r.id,
          name: r.name,
          areaId: r.areaId,
        }))}
        packages={packages.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          availableAtRouterIds: p.availableAtRouters.map((r) => r.id),
        }))}
        suggestedUsername={suggestUsername}
      />
    </div>
  );
}
