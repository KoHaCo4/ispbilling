"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { auth } from "@/auth";

type ImportPackageRow = {
  profileName: string;
  name: string;
  speedMbps: number;
  price: number;
};

export async function importPackagesFromRouter(rows: ImportPackageRow[]) {
  const session = await auth();

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!row.name || !row.speedMbps || !row.price) {
      skipped++;
      continue;
    }

    // Lewati kalau sudah ada Package yang mapping ke profile ini
    const existing = await prisma.package.findFirst({
      where: { mikrotikProfile: row.profileName },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const pkg = await prisma.package.create({
      data: {
        name: row.name,
        speedMbps: row.speedMbps,
        price: row.price,
        // Mapping eksplisit ke profile asli - supaya rate-limit yang sudah
        // dikonfigurasi ISP di Mikrotik TIDAK ditimpa oleh sistem nanti
        mikrotikProfile: row.profileName,
      },
    });

    await logAudit({
      userId: session?.user?.id,
      action: "PACKAGE_IMPORTED",
      entityType: "Package",
      entityId: pkg.id,
      description: `Paket "${row.name}" diimport dari profile Mikrotik "${row.profileName}" oleh ${session?.user?.name ?? "staf"}`,
    });

    imported++;
  }

  revalidatePath("/dashboard/packages");

  return { imported, skipped };
}
