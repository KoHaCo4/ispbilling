"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createPppoeSecret, syncProfileToRouter } from "@/lib/mikrotik/pppoe";
import { getDecryptedRouterCredentials } from "@/lib/mikrotik/credentials";
import { resolveMikrotikProfileName } from "@/lib/mikrotik/profile-naming";
import { setCustomerStatusCore } from "@/services/customer-service";
import { logAudit } from "@/lib/audit";
import { auth } from "@/auth";

async function generateCustomerNumber(): Promise<string> {
  const count = await prisma.customer.count();
  const nextNumber = count + 1;
  return `CUST-${String(nextNumber).padStart(5, "0")}`;
}

export async function createCustomer(formData: FormData) {
  const name = formData.get("name") as string;
  const nik = formData.get("nik") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const address = formData.get("address") as string;
  const areaId = formData.get("areaId") as string;
  const routerId = formData.get("routerId") as string;
  const packageId = formData.get("packageId") as string;
  const connectionType = formData.get("connectionType") as
    | "PPPOE"
    | "HOTSPOT"
    | "STATIC_IP";
  const pppoeUsername = formData.get("pppoeUsername") as string;
  const pppoePassword = formData.get("pppoePassword") as string;

  if (!name || !phone || !address || !areaId || !routerId || !packageId) {
    throw new Error("Field wajib belum lengkap");
  }

  // Validasi server-side: pastikan paket yang dipilih memang tersedia di
  // router ini. Filter di form cuma bantuan UX - validasi ini yang benar-benar
  // mencegah kombinasi tidak valid tersimpan, walau seseorang coba akali
  // form (misal submit manual lewat devtools/API).
  const pkgWithAvailability = await prisma.package.findUnique({
    where: { id: packageId },
    include: { availableAtRouters: { select: { id: true } } },
  });

  if (!pkgWithAvailability) {
    throw new Error("Paket tidak ditemukan");
  }

  const isRestricted = pkgWithAvailability.availableAtRouters.length > 0;
  const isAllowedOnThisRouter =
    !isRestricted ||
    pkgWithAvailability.availableAtRouters.some((r) => r.id === routerId);

  if (!isAllowedOnThisRouter) {
    throw new Error(
      `Paket "${pkgWithAvailability.name}" tidak tersedia untuk router yang dipilih`,
    );
  }

  const customerNumber = await generateCustomerNumber();

  const customer = await prisma.customer.create({
    data: {
      customerNumber,
      name,
      nik: nik || null,
      phone,
      email: email || null,
      address,
      areaId,
      routerId,
      packageId,
      connectionType: connectionType || "PPPOE",
      pppoeUsername: pppoeUsername || null,
      pppoePassword: pppoePassword || null,
      status: "PENDING",
    },
  });

  if (connectionType === "PPPOE" && pppoeUsername && pppoePassword) {
    const router = await prisma.router.findUnique({ where: { id: routerId } });
    const pkg = pkgWithAvailability;

    if (router && pkg) {
      const credentials = getDecryptedRouterCredentials(router);
      const profileName = resolveMikrotikProfileName(pkg);
      const isManualMapping = Boolean(pkg.mikrotikProfile?.trim());

      // Pastikan profile dengan rate-limit yang benar sudah ada di router
      // SEBELUM bikin secret - kalau profile belum ada, secret yang
      // referensi ke profile itu bisa gagal dibuat. Kalau mapping manual
      // (profile sudah dikonfigurasi ISP sebelumnya), jangan timpa
      // rate-limit yang sudah mereka atur sendiri.
      const syncResult = await syncProfileToRouter(
        credentials,
        profileName,
        pkg.speedMbps,
        {
          skipIfExists: isManualMapping,
        },
      );
      if (!syncResult.success) {
        console.error(
          `[Mikrotik] Gagal sync profile "${profileName}" ke router:`,
          syncResult.error,
        );
      }

      const result = await createPppoeSecret(credentials, {
        username: pppoeUsername,
        password: pppoePassword,
        profile: profileName,
      });

      if (!result.success) {
        console.error(
          `[Mikrotik] Gagal membuat PPPoE secret untuk ${customer.customerNumber}:`,
          result.error,
        );
      }
    }
  }

  revalidatePath("/dashboard/customers");
  redirect(`/dashboard/customers/${customer.id}`);
}

export async function updateCustomerStatus(
  customerId: string,
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE" | "PENDING",
) {
  const session = await auth();
  const customer = await setCustomerStatusCore(customerId, status);

  const statusLabel: Record<string, string> = {
    ACTIVE: "diaktifkan",
    SUSPENDED: "diisolir",
    INACTIVE: "dinonaktifkan",
    PENDING: "diset menunggu instalasi",
  };

  await logAudit({
    userId: session?.user?.id,
    action: `CUSTOMER_${status}`,
    entityType: "Customer",
    entityId: customerId,
    description: `Pelanggan ${customer.customerNumber} (${customer.name}) ${statusLabel[status]} oleh ${session?.user?.name ?? "staf"}`,
  });

  revalidatePath(`/dashboard/customers/${customerId}`);
  revalidatePath("/dashboard/customers");
}
