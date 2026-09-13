import { withMikrotikClient, type RouterCredentials } from "./client";

/**
 * Test koneksi ke Mikrotik dengan cara ambil identity system-nya.
 * Dipakai di halaman Router untuk tombol "Test Koneksi" - memastikan
 * IP, port, dan kredensial API sudah benar sebelum dipakai untuk
 * operasi PPPoE yang sebenarnya.
 */
export async function testRouterConnection(
  router: RouterCredentials,
): Promise<
  { success: true; identity: string } | { success: false; error: string }
> {
  try {
    const identity = await withMikrotikClient(router, async (client) => {
      const result = await client.menu("/system/identity").getOnly();
      return (result as Record<string, string>).name ?? "Tidak diketahui";
    });
    return { success: true, identity };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
