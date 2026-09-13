import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { listPppoeSecrets } from "@/lib/mikrotik/pppoe";
import { getDecryptedRouterCredentials } from "@/lib/mikrotik/credentials";
import ImportPreviewTable from "../ImportPreviewTable";

export default async function ImportRouterPage({
  params,
}: {
  params: Promise<{ routerId: string }>;
}) {
  const { routerId } = await params;

  const router = await prisma.router.findUnique({ where: { id: routerId } });
  if (!router) {
    notFound();
  }

  const [secretsResult, packages, existingCustomers] = await Promise.all([
    listPppoeSecrets(getDecryptedRouterCredentials(router)),
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    }),
    prisma.customer.findMany({
      where: { pppoeUsername: { not: null } },
      select: { pppoeUsername: true },
    }),
  ]);

  const alreadyImportedUsernames = existingCustomers
    .map((c) => c.pppoeUsername)
    .filter((u): u is string => u !== null);

  return (
    <div>
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Import dari {router.name}
      </h1>

      {!secretsResult.success ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mt-6">
          Gagal mengambil data dari router: {secretsResult.error}
        </p>
      ) : secretsResult.secrets.length === 0 ? (
        <p className="text-sm text-muted-sage mt-6">
          Tidak ada PPPoE secret di router ini.
        </p>
      ) : (
        <>
          <p className="text-muted-sage text-sm mb-6">
            Ditemukan {secretsResult.secrets.length} PPPoE secret. Lengkapi
            nama, No. HP, dan paket untuk tiap pelanggan yang mau diimport, lalu
            klik Import.
          </p>
          <ImportPreviewTable
            routerId={routerId}
            secrets={secretsResult.secrets}
            packages={packages}
            alreadyImportedUsernames={alreadyImportedUsernames}
          />
        </>
      )}
    </div>
  );
}
