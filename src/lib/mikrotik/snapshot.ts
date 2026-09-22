import { RouterOSAPI } from "node-routeros";
import type { RouterCredentials } from "./client";

/**
 * Snapshot gabungan untuk load AWAL halaman Monitoring.
 *
 * Kenapa ini perlu (lihat juga MonitoringClient.tsx): sebelumnya
 * LiveMonitor dan TrafficMonitor masing-masing connect-login-close ke
 * Mikrotik secara terpisah (dan TrafficMonitor bahkan melakukan 3
 * connect terpisah lagi buat "fast-poll" 2 sampel pertama). Total bisa
 * 5 koneksi berurutan sebelum halaman selesai loading - kalau router
 * diakses lewat internet ke lokasi ISP (bukan LAN kantor), tiap
 * connect+login makan waktu, jadi 5x lipat itu numpuk jadi puluhan
 * detik.
 *
 * Fungsi ini membuka SATU koneksi, mengambil ppp/active + ppp/secret +
 * interface (sekaligus stats rx/tx-nya) secara berurutan dalam koneksi
 * yang sama, lalu ditutup. Hasilnya dipakai sebagai titik data pertama
 * di kedua widget, jadi mereka tidak perlu connect sendiri-sendiri lagi
 * di awal - cukup lanjut ke polling normal 15 detik.
 */
export type MonitoringSnapshot = {
  activeCount: number;
  totalSecrets: number;
  // Username persis yang lagi konek sekarang - dipakai buat cocokkan dengan
  // data pelanggan di database untuk fitur "Pelanggan Offline" (pelanggan
  // status ACTIVE di billing tapi username-nya tidak ada di daftar ini
  // berarti sedang tidak terkoneksi).
  activeUsernames: string[];
  interfaceNames: string[];
  selectedInterface: string | null;
  rxByte: number | null;
  txByte: number | null;
  timestamp: number;
};

export async function getMonitoringSnapshot(
  router: RouterCredentials,
  // Interface yang mau diambil byte counter-nya. Kalau tidak diisi (load
  // pertama), auto-pilih ether1/interface pertama. Kalau user ganti pilihan
  // di dropdown TrafficMonitor, nama interface itu dikirim ke sini supaya
  // tidak perlu koneksi terpisah lagi hanya untuk ganti interface.
  preferredInterface?: string | null,
): Promise<
  | { success: true; snapshot: MonitoringSnapshot }
  | { success: false; error: string }
> {
  const conn = new RouterOSAPI({
    host: router.ipAddress,
    user: router.apiUsername,
    password: router.apiPassword,
    port: router.apiPort,
    timeout: 8,
  });

  try {
    await conn.connect();

    // Berurutan (bukan Promise.all) dalam SATU koneksi yang sama -
    // masih jauh lebih cepat daripada 3 koneksi terpisah, dan lebih
    // aman karena tidak bergantung pada dukungan request paralel
    // library ini.
    const active = (await conn.write("/ppp/active/print", [])) as Array<
      Record<string, string>
    >;
    const secrets = (await conn.write("/ppp/secret/print", [])) as unknown[];
    const interfaces = (await conn.write("/interface/print", [
      "=stats",
    ])) as Array<Record<string, string>>;

    conn.close();

    // Sama seperti listInterfaceNames() - cuma port ethernet fisik yang
    // relevan buat dropdown pilihan interface.
    const etherOnly = interfaces.filter((d) => d.type === "ether");
    const interfaceNames = etherOnly.map((d) => d.name).filter(Boolean);
    const selectedInterface =
      preferredInterface && interfaceNames.includes(preferredInterface)
        ? preferredInterface
        : interfaceNames.includes("ether1")
          ? "ether1"
          : (interfaceNames[0] ?? null);
    const selectedEntry = selectedInterface
      ? etherOnly.find((d) => d.name === selectedInterface)
      : undefined;

    return {
      success: true,
      snapshot: {
        activeCount: active.length,
        totalSecrets: secrets.length,
        activeUsernames: active.map((a) => a.name).filter(Boolean),
        interfaceNames,
        selectedInterface,
        rxByte: selectedEntry ? Number(selectedEntry["rx-byte"] ?? 0) : null,
        txByte: selectedEntry ? Number(selectedEntry["tx-byte"] ?? 0) : null,
        timestamp: Date.now(),
      },
    };
  } catch (err) {
    try {
      conn.close();
    } catch {
      // koneksi mungkin sudah tertutup, aman diabaikan
    }
    return { success: false, error: (err as Error).message };
  }
}
