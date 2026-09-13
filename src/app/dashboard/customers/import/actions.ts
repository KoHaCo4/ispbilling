"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { auth } from "@/auth";

type ImportRow = {
  username: string;
  profile: string;
  disabled: boolean;
  name: string;
  phone: string;
  address: string;
  packageId: string;
};

async function generateCustomerNumber(): Promise<string> {
  const count = await prisma.customer.count();
  const nextNumber = count + 1;
  return `CUST-${String(nextNumber).padStart(5, "0")}`;
}

export async function importSelectedCustomers(
  routerId: string,
  rows: ImportRow[],
) {
  const session = await auth();
  const router = await prisma.router.findUnique({ where: { id: routerId } });

  if (!router) {
    throw new Error("Router tidak ditemukan");
  }

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    // Lewati kalau data wajib tidak lengkap atau username sudah pernah diimport
    if (!row.name || !row.phone || !row.packageId) {
      skipped++;
      continue;
    }

    const existing = await prisma.customer.findUnique({
      where: { pppoeUsername: row.username },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const customerNumber = await generateCustomerNumber();

    const customer = await prisma.customer.create({
      data: {
        customerNumber,
        name: row.name,
        phone: row.phone,
        address: row.address || "Belum diisi - lengkapi setelah import",
        areaId: router.areaId,
        routerId: router.id,
        packageId: row.packageId,
        connectionType: "PPPOE",
        pppoeUsername: row.username,
        // Password tidak bisa ditarik dari Mikrotik (RouterOS API tidak
        // mengembalikan password asli demi keamanan) - kosongkan, staf
        // perlu set ulang manual kalau butuh sinkronisasi password nanti
        pppoePassword: null,
        // Status ikut kondisi asli di Mikrotik: kalau secret enabled di
        // Mikrotik, anggap pelanggan ini sudah aktif; kalau disabled,
        // anggap sudah dalam kondisi isolir
        status: row.disabled ? "SUSPENDED" : "ACTIVE",
        activatedAt: row.disabled ? null : new Date(),
        suspendedAt: row.disabled ? new Date() : null,
      },
    });

    await logAudit({
      userId: session?.user?.id,
      action: "CUSTOMER_IMPORTED",
      entityType: "Customer",
      entityId: customer.id,
      description: `Pelanggan ${customer.customerNumber} (${customer.name}) diimport dari Mikrotik "${router.name}" oleh ${session?.user?.name ?? "staf"}`,
    });

    imported++;
  }

  revalidatePath("/dashboard/customers");

  return { imported, skipped };
}
