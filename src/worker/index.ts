import "dotenv/config";
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import {
  generateMonthlyInvoicesCore,
  markOverdueInvoicesCore,
  autoSuspendOverdueCustomersCore,
} from "../services/invoice-service";

const connection = new IORedis(
  process.env.REDIS_URL ?? "redis://localhost:6379",
  {
    maxRetriesPerRequest: null, // wajib untuk BullMQ worker
  },
);

const QUEUE_NAME = "isp-billing-cron";
const GRACE_DAYS_BEFORE_SUSPEND = 7; // jumlah hari toleransi sebelum auto-isolir

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
        const result = await generateMonthlyInvoicesCore(
          now.getMonth() + 1,
          now.getFullYear(),
        );
        console.log(
          `[Cron] Generate invoice bulanan selesai - dibuat: ${result.created}, notifikasi terkirim: ${result.notified}, dilewati: ${result.skipped}, total pelanggan aktif: ${result.total}`,
        );
        return result;
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
