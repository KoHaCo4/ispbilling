import { prisma } from "@/lib/prisma";
import MonitoringClient from "./MonitoringClient";

export default async function MonitoringPage() {
  const routers = await prisma.router.findMany({
    include: { area: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="">
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Monitoring
      </h1>
      <p className="text-muted-sage text-sm mb-8">
        Data live langsung dari Mikrotik, update tiap 15 detik selama halaman
        ini dibuka.
      </p>

      <MonitoringClient
        routers={routers.map((r) => ({
          id: r.id,
          name: r.name,
          areaName: r.area.name,
        }))}
      />
    </div>
  );
}
