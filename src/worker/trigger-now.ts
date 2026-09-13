import "dotenv/config";
import { Queue } from "bullmq";
import IORedis from "ioredis";

async function main() {
  const connection = new IORedis(
    process.env.REDIS_URL ?? "redis://localhost:6379",
    {
      maxRetriesPerRequest: null,
    },
  );

  const queue = new Queue("isp-billing-cron", { connection });

  const jobName = process.argv[2] ?? "generate-monthly-invoices";
  const validJobs = [
    "generate-monthly-invoices",
    "mark-overdue-invoices",
    "auto-suspend-overdue",
  ];

  if (!validJobs.includes(jobName)) {
    console.error(`Nama job tidak dikenal: ${jobName}`);
    console.error(`Pilihan: ${validJobs.join(", ")}`);
    process.exit(1);
  }

  await queue.add(jobName, {});
  console.log(
    `Job "${jobName}" ditambahkan ke antrian - cek log di terminal "npm run worker"`,
  );

  await queue.close();
  process.exit(0);
}

main();
