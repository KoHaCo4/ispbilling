"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { listPppoeProfiles } from "@/lib/mikrotik/pppoe";
import { getDecryptedRouterCredentials } from "@/lib/mikrotik/credentials";
import { logAudit } from "@/lib/audit";
import { auth } from "@/auth";

export async function createPackage(formData: FormData) {
  const session = await auth();

  const name = formData.get("name") as string;
  const speedMbps = Number(formData.get("speedMbps"));
  const price = Number(formData.get("price"));
  const mikrotikProfile = formData.get("mikrotikProfile") as string;
  const availableAtRouterIds = formData.getAll(
    "availableAtRouterIds",
  ) as string[];

  if (!name || !speedMbps || !price) {
    throw new Error("Field wajib belum lengkap");
  }

  const pkg = await prisma.package.create({
    data: {
      name,
      speedMbps,
      price,
      mikrotikProfile: mikrotikProfile || null,
      availableAtRouters:
        availableAtRouterIds.length > 0
          ? { connect: availableAtRouterIds.map((id) => ({ id })) }
          : undefined,
    },
  });

  await logAudit({
    userId: session?.user?.id,
    action: "PACKAGE_CREATED",
    entityType: "Package",
    entityId: pkg.id,
    description: `Paket "${name}" dibuat oleh ${session?.user?.name ?? "staf"}`,
  });

  revalidatePath("/dashboard/packages");
  redirect("/dashboard/packages");
}

export async function updatePackage(packageId: string, formData: FormData) {
  const session = await auth();

  const name = formData.get("name") as string;
  const speedMbps = Number(formData.get("speedMbps"));
  const price = Number(formData.get("price"));
  const mikrotikProfile = formData.get("mikrotikProfile") as string;
  const isActive = formData.get("isActive") === "on";
  const availableAtRouterIds = formData.getAll(
    "availableAtRouterIds",
  ) as string[];

  if (!name || !speedMbps || !price) {
    throw new Error("Field wajib belum lengkap");
  }

  await prisma.package.update({
    where: { id: packageId },
    data: {
      name,
      speedMbps,
      price,
      mikrotikProfile: mikrotikProfile || null,
      isActive,
      // "set" mengganti seluruh relasi dengan daftar baru - aman dipakai
      // walau daftarnya kosong (berarti "tersedia di semua router")
      availableAtRouters: { set: availableAtRouterIds.map((id) => ({ id })) },
    },
  });

  await logAudit({
    userId: session?.user?.id,
    action: "PACKAGE_UPDATED",
    entityType: "Package",
    entityId: packageId,
    description: `Paket "${name}" diubah oleh ${session?.user?.name ?? "staf"}`,
  });

  revalidatePath("/dashboard/packages");
  revalidatePath(`/dashboard/packages/${packageId}`);
  redirect("/dashboard/packages");
}

export type FetchProfilesState =
  | { success: true; profiles: { name: string; rateLimit: string }[] }
  | { success: false; error: string }
  | null;

/**
 * Dipanggil dari picker di form Package - ambil daftar profile yang
 * benar-benar ada di router pilihan staf, secara on-demand (bukan
 * disimpan/ditampilkan permanen di menu manapun).
 */
export async function fetchRouterProfilesAction(
  _prevState: FetchProfilesState,
  formData: FormData,
): Promise<FetchProfilesState> {
  const routerId = formData.get("routerId") as string;

  if (!routerId) {
    return { success: false, error: "Pilih router dulu" };
  }

  const router = await prisma.router.findUnique({ where: { id: routerId } });
  if (!router) {
    return { success: false, error: "Router tidak ditemukan" };
  }

  const result = await listPppoeProfiles(getDecryptedRouterCredentials(router));

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, profiles: result.profiles };
}
