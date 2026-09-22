"use server";

import { prisma } from "@/lib/prisma";
import { getDecryptedRouterCredentials } from "@/lib/mikrotik/credentials";
import { getMonitoringSnapshot } from "@/lib/mikrotik/snapshot";

export type OfflineCustomer = {
  id: string;
  customerNumber: string;
  name: string;
  phone: string;
  pppoeUsername: string;
};

/**
 * Satu-satunya action yang dipakai halaman Monitoring. Dipanggil tiap 15
 * detik oleh MonitoringClient dan mengambil active session, total secret,
 * daftar interface, byte counter interface terpilih (semua dalam SATU
 * koneksi Mikrotik - lihat src/lib/mikrotik/snapshot.ts), DITAMBAH daftar
 * pelanggan yang statusnya ACTIVE di billing tapi username PPPoE-nya
 * ternyata tidak terdeteksi konek di router saat ini ("offline").
 *
 * Pencocokan offline dilakukan di sini (bukan di snapshot.ts) karena butuh
 * query database - snapshot.ts sengaja dibuat murni cuma bicara ke
 * Mikrotik, tidak tahu apa-apa soal data billing.
 */
export async function getMonitoringSnapshotAction(
  routerId: string,
  preferredInterface?: string | null,
) {
  const router = await prisma.router.findUnique({ where: { id: routerId } });
  if (!router) {
    return { success: false as const, error: "Router tidak ditemukan" };
  }

  const result = await getMonitoringSnapshot(
    getDecryptedRouterCredentials(router),
    preferredInterface,
  );

  if (!result.success) {
    return result;
  }

  // Kandidat: semua pelanggan PPPoE yang statusnya ACTIVE di billing untuk
  // router ini - hanya pelanggan ACTIVE yang "seharusnya" online, jadi
  // pelanggan PENDING/SUSPENDED/INACTIVE tidak ikut dihitung sebagai
  // "offline" (memang sengaja diputus/belum diaktifkan).
  const candidates = await prisma.customer.findMany({
    where: {
      routerId,
      status: "ACTIVE",
      connectionType: "PPPOE",
      pppoeUsername: { not: null },
    },
    select: {
      id: true,
      customerNumber: true,
      name: true,
      phone: true,
      pppoeUsername: true,
    },
    orderBy: { name: "asc" },
  });

  const activeSet = new Set(result.snapshot.activeUsernames);
  const offlineCustomers: OfflineCustomer[] = candidates
    .filter((c) => c.pppoeUsername && !activeSet.has(c.pppoeUsername))
    .map((c) => ({
      id: c.id,
      customerNumber: c.customerNumber,
      name: c.name,
      phone: c.phone,
      pppoeUsername: c.pppoeUsername as string,
    }));

  return {
    ...result,
    offlineCustomers,
    totalActivePppoeCustomers: candidates.length,
  };
}
