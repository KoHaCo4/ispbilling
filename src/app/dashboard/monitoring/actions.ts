"use server";

import { prisma } from "@/lib/prisma";
import { getDecryptedRouterCredentials } from "@/lib/mikrotik/credentials";
import { getMonitoringSnapshot } from "@/lib/mikrotik/snapshot";

/**
 * Satu-satunya action yang dipakai halaman Monitoring. Dipanggil tiap 15
 * detik oleh MonitoringClient dan mengambil active session, total secret,
 * daftar interface, DAN byte counter interface terpilih sekaligus dalam
 * satu koneksi Mikrotik. Menggantikan getLiveStatsAction /
 * listInterfaceNamesAction / getInterfaceByteCountersAction yang dulu
 * dipanggil terpisah-pisah (sampai 5 koneksi berurutan tiap load awal -
 * ini penyebab loading lama di monitoring). Lihat catatan di
 * src/lib/mikrotik/snapshot.ts.
 *
 * preferredInterface dikirim saat user ganti pilihan di dropdown
 * TrafficMonitor, supaya tidak perlu koneksi terpisah lagi hanya untuk
 * pindah interface.
 */
export async function getMonitoringSnapshotAction(
  routerId: string,
  preferredInterface?: string | null,
) {
  const router = await prisma.router.findUnique({ where: { id: routerId } });
  if (!router) {
    return { success: false as const, error: "Router tidak ditemukan" };
  }
  return getMonitoringSnapshot(
    getDecryptedRouterCredentials(router),
    preferredInterface,
  );
}
