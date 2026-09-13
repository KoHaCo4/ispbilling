import { prisma } from "@/lib/prisma";

/**
 * Catat satu entri audit log. userId=null berarti aksi ini dipicu otomatis
 * oleh sistem (cron job atau webhook), bukan oleh staf.
 *
 * SENGAJA tidak memanggil auth() di dalam fungsi ini - karena fungsi ini
 * dipakai juga dari worker/webhook yang tidak punya request context sama
 * sekali. Pemanggil (Server Action) yang punya session harus mengirim
 * userId secara eksplisit.
 *
 * Kegagalan mencatat log TIDAK BOLEH membatalkan operasi utama - audit
 * log itu pelengkap, bukan syarat.
 */
export async function logAudit(params: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        description: params.description,
      },
    });
  } catch (err) {
    console.error("[Audit] Gagal mencatat log:", err);
  }
}
