import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { listPppoeProfiles } from "@/lib/mikrotik/pppoe";
import { getDecryptedRouterCredentials } from "@/lib/mikrotik/credentials";
import {
  resolveMikrotikProfileName,
  parseRateLimitToMbps,
} from "@/lib/mikrotik/profile-naming";
import PackageImportTable from "./PackageImportTable";

export default async function ImportPackagesPage({
  params,
}: {
  params: Promise<{ routerId: string }>;
}) {
  const { routerId } = await params;

  const router = await prisma.router.findUnique({ where: { id: routerId } });
  if (!router) {
    notFound();
  }

  const [profilesResult, existingPackages] = await Promise.all([
    listPppoeProfiles(getDecryptedRouterCredentials(router)),
    prisma.package.findMany(),
  ]);

  const alreadyMappedProfileNames = new Set(
    existingPackages.map((p) => resolveMikrotikProfileName(p)),
  );

  return (
    <div>
      <h1 className="font-archivo text-2xl font-bold text-primary-text mb-1">
        Import Paket dari {router.name}
      </h1>

      {!profilesResult.success ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 mt-6">
          Gagal mengambil data dari router: {profilesResult.error}
        </p>
      ) : (
        <>
          <p className="text-muted-sage text-sm mb-6">
            Menampilkan profile yang ADA di router ini tapi BELUM ter-mapping ke
            paket manapun di web. Lengkapi nama dan harga, lalu import.
          </p>
          <PackageImportTable
            profiles={profilesResult.profiles
              .filter((p) => !alreadyMappedProfileNames.has(p.name))
              .map((p) => ({
                profileName: p.name,
                suggestedSpeed: parseRateLimitToMbps(p.rateLimit),
              }))}
          />
        </>
      )}
    </div>
  );
}
