"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { testRouterConnection } from "@/lib/mikrotik/testConnection";
import { syncProfileToRouter } from "@/lib/mikrotik/pppoe";
import { resolveMikrotikProfileName } from "@/lib/mikrotik/profile-naming";
import { getDecryptedRouterCredentials } from "@/lib/mikrotik/credentials";
import { encrypt } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { auth } from "@/auth";

export async function createRouter(formData: FormData) {
  const session = await auth();

  const name = formData.get("name") as string;
  const areaId = formData.get("areaId") as string;
  const ipAddress = formData.get("ipAddress") as string;
  const apiPort = Number(formData.get("apiPort")) || 8728;
  const apiUsername = formData.get("apiUsername") as string;
  const apiPassword = formData.get("apiPassword") as string;
  const isMainBras = formData.get("isMainBras") === "on";

  if (!name || !areaId || !ipAddress || !apiUsername || !apiPassword) {
    throw new Error("Field wajib belum lengkap");
  }

  const router = await prisma.router.create({
    data: {
      name,
      areaId,
      ipAddress,
      apiPort,
      apiUsername,
      apiPassword: encrypt(apiPassword),
      isMainBras,
    },
  });

  await logAudit({
    userId: session?.user?.id,
    action: "ROUTER_CREATED",
    entityType: "Router",
    entityId: router.id,
    description: `Router "${name}" (${ipAddress}) dibuat oleh ${session?.user?.name ?? "staf"}`,
  });

  revalidatePath("/dashboard/routers");
  redirect("/dashboard/routers");
}

export async function updateRouter(routerId: string, formData: FormData) {
  const session = await auth();

  const name = formData.get("name") as string;
  const areaId = formData.get("areaId") as string;
  const ipAddress = formData.get("ipAddress") as string;
  const apiPort = Number(formData.get("apiPort")) || 8728;
  const apiUsername = formData.get("apiUsername") as string;
  const apiPassword = formData.get("apiPassword") as string;
  const isMainBras = formData.get("isMainBras") === "on";

  if (!name || !areaId || !ipAddress || !apiUsername) {
    throw new Error("Field wajib belum lengkap");
  }

  const passwordChanged = Boolean(apiPassword);

  await prisma.router.update({
    where: { id: routerId },
    data: {
      name,
      areaId,
      ipAddress,
      apiPort,
      apiUsername,
      ...(apiPassword ? { apiPassword: encrypt(apiPassword) } : {}),
      isMainBras,
    },
  });

  await logAudit({
    userId: session?.user?.id,
    action: "ROUTER_UPDATED",
    entityType: "Router",
    entityId: routerId,
    description: `Router "${name}" diubah oleh ${session?.user?.name ?? "staf"}${passwordChanged ? " (TERMASUK ganti password API)" : ""}`,
  });

  revalidatePath("/dashboard/routers");
  revalidatePath(`/dashboard/routers/${routerId}`);
  redirect("/dashboard/routers");
}

export type TestConnectionState =
  | { success: true; identity: string }
  | { success: false; error: string }
  | null;

export async function testAndUpdateRouterStatus(routerId: string) {
  const router = await prisma.router.findUnique({ where: { id: routerId } });
  if (!router) {
    throw new Error("Router tidak ditemukan");
  }

  const result = await testRouterConnection(
    getDecryptedRouterCredentials(router),
  );

  await prisma.router.update({
    where: { id: routerId },
    data: {
      isOnline: result.success,
      lastSeenAt: result.success ? new Date() : router.lastSeenAt,
    },
  });

  revalidatePath(`/dashboard/routers/${routerId}`);
  revalidatePath("/dashboard/routers");

  return result;
}

export async function testConnectionAction(
  _prevState: TestConnectionState,
  formData: FormData,
): Promise<TestConnectionState> {
  const routerId = formData.get("routerId") as string;
  return testAndUpdateRouterStatus(routerId);
}

export type SyncPackagesState =
  | { success: true; synced: number; failed: number }
  | { success: false; error: string }
  | null;

/**
 * Sync SEMUA package aktif ke satu router sekaligus - bikin/update PPP
 * Profile untuk tiap paket, jadi rate-limit-nya selalu sesuai apapun
 * pelanggan yang nanti didaftarkan pakai paket itu di router ini.
 */
export async function syncAllPackagesAction(
  _prevState: SyncPackagesState,
  formData: FormData,
): Promise<SyncPackagesState> {
  const routerId = formData.get("routerId") as string;
  const router = await prisma.router.findUnique({ where: { id: routerId } });

  if (!router) {
    return { success: false, error: "Router tidak ditemukan" };
  }

  const packages = await prisma.package.findMany({ where: { isActive: true } });
  const credentials = getDecryptedRouterCredentials(router);

  let synced = 0;
  let failed = 0;

  for (const pkg of packages) {
    const profileName = resolveMikrotikProfileName(pkg);
    const isManualMapping = Boolean(pkg.mikrotikProfile?.trim());
    const result = await syncProfileToRouter(
      credentials,
      profileName,
      pkg.speedMbps,
      {
        skipIfExists: isManualMapping,
      },
    );
    if (result.success) {
      synced++;
    } else {
      failed++;
      console.error(
        `[Mikrotik] Gagal sync profile "${profileName}":`,
        result.error,
      );
    }
  }

  return { success: true, synced, failed };
}
