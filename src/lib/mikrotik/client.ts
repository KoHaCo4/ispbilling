import { RouterOSClient } from "routeros-client";

export type RouterCredentials = {
  ipAddress: string;
  apiPort: number;
  apiUsername: string;
  apiPassword: string;
};

/**
 * Menjalankan satu operasi ke Mikrotik lalu otomatis menutup koneksi,
 * apapun hasilnya (berhasil atau gagal). Dipakai supaya tiap fungsi di
 * pppoe.ts tidak perlu urus buka/tutup koneksi manual berulang-ulang.
 */
export async function withMikrotikClient<T>(
  router: RouterCredentials,
  callback: (
    client: Awaited<ReturnType<RouterOSClient["connect"]>>,
  ) => Promise<T>,
): Promise<T> {
  const api = new RouterOSClient({
    host: router.ipAddress,
    user: router.apiUsername,
    password: router.apiPassword,
    port: router.apiPort,
    timeout: 8, // detik - jangan biarkan UI nge-hang lama kalau router mati/tidak terjangkau
  });

  try {
    const client = await api.connect();
    const result = await callback(client);
    return result;
  } finally {
    // Tutup koneksi selalu, baik sukses maupun error, biar tidak
    // ninggalin koneksi menggantung di Mikrotik
    api.close();
  }
}
