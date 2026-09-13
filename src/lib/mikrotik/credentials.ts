import { decrypt } from "@/lib/crypto";
import type { RouterCredentials } from "./client";

/**
 * Konversi data Router dari database (dengan apiPassword terenkripsi)
 * jadi RouterCredentials siap pakai (apiPassword sudah di-decrypt).
 *
 * SELALU pakai fungsi ini, jangan pernah ambil router.apiPassword
 * langsung dari database untuk connect ke Mikrotik.
 */
export function getDecryptedRouterCredentials(router: {
  ipAddress: string;
  apiPort: number;
  apiUsername: string;
  apiPassword: string;
}): RouterCredentials {
  return {
    ipAddress: router.ipAddress,
    apiPort: router.apiPort,
    apiUsername: router.apiUsername,
    apiPassword: decrypt(router.apiPassword),
  };
}
