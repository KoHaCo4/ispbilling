import "dotenv/config";
import {
  generateMonthlyInvoicesCore,
  markOverdueInvoicesCore,
  autoSuspendOverdueCustomersCore,
} from "../services/invoice-service";

async function main() {
  const now = new Date();

  console.log("--- Generate Invoice Bulanan ---");
  const generateResult = await generateMonthlyInvoicesCore(
    now.getMonth() + 1,
    now.getFullYear(),
  );
  console.log(generateResult);

  console.log("\n--- Cek Invoice Jatuh Tempo ---");
  const overdueCount = await markOverdueInvoicesCore();
  console.log(`${overdueCount} invoice ditandai OVERDUE`);

  console.log("\n--- Auto-Suspend Pelanggan Menunggak ---");
  const suspendedCount = await autoSuspendOverdueCustomersCore(7);
  console.log(`${suspendedCount} pelanggan di-isolir otomatis`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
