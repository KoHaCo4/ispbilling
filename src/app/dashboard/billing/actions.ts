"use server";

import { revalidatePath } from "next/cache";
import {
  generateMonthlyInvoicesCore,
  markOverdueInvoicesCore,
  recordPaymentCore,
} from "@/services/invoice-service";
import { auth } from "@/auth";

export async function generateMonthlyInvoices(
  periodMonth: number,
  periodYear: number,
) {
  const result = await generateMonthlyInvoicesCore(periodMonth, periodYear);
  revalidatePath("/dashboard/billing");
  return result;
}

export async function markOverdueInvoices() {
  const count = await markOverdueInvoicesCore();
  revalidatePath("/dashboard/billing");
  return count;
}

export async function recordPayment(formData: FormData) {
  const session = await auth();

  const invoiceId = formData.get("invoiceId") as string;
  const amount = Number(formData.get("amount"));
  const method = formData.get("method") as
    | "TRANSFER"
    | "VIRTUAL_ACCOUNT"
    | "QRIS"
    | "EWALLET"
    | "CASH";
  const referenceId = formData.get("referenceId") as string;

  if (!invoiceId || !amount || amount <= 0) {
    throw new Error("Data pembayaran tidak valid");
  }

  await recordPaymentCore({
    invoiceId,
    amount,
    method,
    referenceId,
    userId: session?.user?.id,
    actorLabel: session?.user?.name ?? "staf",
  });

  revalidatePath(`/dashboard/billing/${invoiceId}`);
  revalidatePath("/dashboard/billing");
}
