import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import {
  startInvoiceGenerationStatus,
  refreshInvoiceGenerationStatus,
  stopInvoiceGenerationStatus,
} from "../lib/billing-generation-status";
import {
  generateMonthlyInvoicesCore,
  markOverdueInvoicesCore,
  autoSuspendOverdueCustomersCore,
  GRACE_DAYS_BEFORE_SUSPEND,
} from "../services/invoice-service";

const connection = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  {
    maxRetriesPerRequest: null, // wajib untuk BullMQ worker
  },
);

const QUEUE_NAME = "isp-billing-cron";

export const billingQueue = new Queue(QUEUE_NAME, { connection });

/**
 * Daftarkan jadwal cron. Pakai jobId tetap supaya aman dijalankan berkali-kali
 * (restart worker tidak akan mendaftarkan job duplikat dengan jadwal yang sama).
 */
async function registerScheduledJobs() {
  await billingQueue.upsertJobScheduler(
    "generate-monthly-invoices-scheduler",
    { pattern: "5 0 1 * *" }, // tanggal 1 tiap bulan, jam 00:05
    { name: "generate-monthly-invoices" },
  );

  await billingQueue.upsertJobScheduler(
    "mark-overdue-invoices-scheduler",
    { pattern: "0 1 * * *" }, // tiap hari jam 01:00
    { name: "mark-overdue-invoices" },
  );

  await billingQueue.upsertJobScheduler(
    "auto-suspend-overdue-scheduler",
    { pattern: "0 2 * * *" }, // tiap hari jam 02:00
    { name: "auto-suspend-overdue" },
  );

  console.log("[Worker] Jadwal cron job berhasil didaftarkan:");
  console.log("  - generate-monthly-invoices : tanggal 1 tiap bulan, 00:05");
  console.log("  - mark-overdue-invoices     : tiap hari, 01:00");
  console.log("  - auto-suspend-overdue      : tiap hari, 02:00");
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const now = new Date();

    switch (job.name) {
      case "generate-monthly-invoices": {
        const runId = `${job.id ?? "unknown"}-${Date.now()}`;
        let heartbeat: NodeJS.Timeout | undefined;

        try {
          await startInvoiceGenerationStatus(runId);
        } catch (error) {
          // Status UI tidak boleh menghentikan proses billing jika Redis status
          // sedang bermasalah. BullMQ sendiri tetap menjadi sumber eksekusi job.
          console.error("[Billing Status] Gagal menandai proses dimulai:", error);
        }

        // Proses pengiriman bisa berlangsung lama (30-60 detik per pelanggan),
        // jadi status di Redis diperpanjang secara berkala agar overlay di
        // halaman Tagihan tetap aktif selama worker benar-benar bekerja.
        heartbeat = setInterval(() => {
          void refreshInvoiceGenerationStatus(runId).catch((error) => {
            console.error("[Billing Status] Gagal memperbarui heartbeat:", error);
          });
        }, 30_000);

        try {
          const result = await generateMonthlyInvoicesCore(
            now.getMonth() + 1,
            now.getFullYear(),
          );
          console.log(
            `[Cron] Generate invoice bulanan selesai - dibuat: ${result.created}, notifikasi terkirim: ${result.notified}, dilewati: ${result.skipped}, total pelanggan aktif: ${result.total}`,
          );
          return result;
        } finally {
          if (heartbeat) clearInterval(heartbeat);
          try {
            await stopInvoiceGenerationStatus(runId);
          } catch (error) {
            console.error("[Billing Status] Gagal menandai proses selesai:", error);
          }
        }
      }

      case "mark-overdue-invoices": {
        const count = await markOverdueInvoicesCore();
        console.log(`[Cron] ${count} invoice ditandai OVERDUE`);
        return { count };
      }

      case "auto-suspend-overdue": {
        const count = await autoSuspendOverdueCustomersCore(
          GRACE_DAYS_BEFORE_SUSPEND,
        );
        console.log(`[Cron] ${count} pelanggan di-isolir otomatis`);
        return { count };
      }

      default:
        console.warn(`[Cron] Job tidak dikenal: ${job.name}`);
    }
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job "${job.name}" selesai.`);
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job "${job?.name}" GAGAL:`, err.message);
});

registerScheduledJobs();

console.log("[Worker] ISP Billing worker berjalan, menunggu jadwal...");
