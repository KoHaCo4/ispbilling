import { prisma } from "@/lib/prisma";
import { setCustomerStatusCore } from "./customer-service";
import { sendWhatsAppMessage } from "@/lib/whatsapp/fonnte";
import { createPaymentLink } from "@/lib/midtrans";
import { logAudit } from "@/lib/audit";

async function generateInvoiceNumber(
  periodMonth: number,
  periodYear: number,
): Promise<string> {
  const count = await prisma.invoice.count({
    where: { periodMonth, periodYear },
  });
  const nextNumber = count + 1;
  return `INV-${periodYear}${String(periodMonth).padStart(2, "0")}-${String(nextNumber).padStart(5, "0")}`;
}

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export async function generateMonthlyInvoicesCore(
  periodMonth: number,
  periodYear: number,
) {
  const activeCustomers = await prisma.customer.findMany({
    where: { status: "ACTIVE" },
    include: { package: true, area: true },
  });

  let created = 0;
  let skipped = 0;

  for (const customer of activeCustomers) {
    const existing = await prisma.invoice.findFirst({
      where: { customerId: customer.id, periodMonth, periodYear },
    });

    if (existing) {
      skipped++;
      continue;
    }

    const override = await prisma.areaPackagePrice.findUnique({
      where: {
        areaId_packageId: {
          areaId: customer.areaId,
          packageId: customer.packageId,
        },
      },
    });

    const amount = override?.price ?? customer.package.price;
    const invoiceNumber = await generateInvoiceNumber(periodMonth, periodYear);
    const dueDate = new Date(periodYear, periodMonth - 1, 10);

    // Generate link pembayaran online SEBELUM invoice disimpan, supaya
    // paymentUrl bisa langsung diisi dalam satu create (bukan create lalu update)
    const paymentLinkResult = await createPaymentLink({
      orderId: invoiceNumber,
      grossAmount: amount,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerEmail: customer.email,
    });

    if (!paymentLinkResult.success) {
      console.error(
        `[Midtrans] Gagal generate link pembayaran untuk ${invoiceNumber}:`,
        paymentLinkResult.error,
      );
    }

    await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
        packageId: customer.packageId,
        periodMonth,
        periodYear,
        amount,
        dueDate,
        status: "UNPAID",
        paymentUrl: paymentLinkResult.success
          ? paymentLinkResult.redirectUrl
          : null,
      },
    });

    created++;

    const paymentLine = paymentLinkResult.success
      ? `\n\nBayar online: ${paymentLinkResult.redirectUrl}`
      : "";

    const waResult = await sendWhatsAppMessage(
      customer.phone,
      `Yth. ${customer.name},\n\nTagihan internet periode ${monthNames[periodMonth - 1]} ${periodYear} sebesar Rp${amount.toLocaleString("id-ID")} telah terbit.\nJatuh tempo: ${dueDate.toLocaleDateString("id-ID", { dateStyle: "long" })}.\n\nNo. Invoice: ${invoiceNumber}${paymentLine}\n\nTerima kasih.`,
    );
    if (!waResult.success) {
      console.error(
        `[WhatsApp] Gagal kirim notifikasi invoice ke ${customer.name}:`,
        waResult.error,
      );
    }
  }

  return { created, skipped, total: activeCustomers.length };
}

export async function markOverdueInvoicesCore(): Promise<number> {
  const toMarkOverdue = await prisma.invoice.findMany({
    where: { status: "UNPAID", dueDate: { lt: new Date() } },
    include: { customer: true },
  });

  if (toMarkOverdue.length === 0) {
    return 0;
  }

  await prisma.invoice.updateMany({
    where: { status: "UNPAID", dueDate: { lt: new Date() } },
    data: { status: "OVERDUE" },
  });

  for (const invoice of toMarkOverdue) {
    const paymentLine = invoice.paymentUrl
      ? `\n\nBayar online: ${invoice.paymentUrl}`
      : "";
    const waResult = await sendWhatsAppMessage(
      invoice.customer.phone,
      `Yth. ${invoice.customer.name},\n\nTagihan Anda (No. ${invoice.invoiceNumber}) sebesar Rp${invoice.amount.toLocaleString("id-ID")} telah melewati jatuh tempo.\n\nMohon segera lakukan pembayaran untuk menghindari pemutusan layanan.${paymentLine}\n\nTerima kasih.`,
    );
    if (!waResult.success) {
      console.error(
        `[WhatsApp] Gagal kirim notifikasi overdue ke ${invoice.customer.name}:`,
        waResult.error,
      );
    }
  }

  return toMarkOverdue.length;
}

export async function autoSuspendOverdueCustomersCore(graceDays: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - graceDays);

  const overdueInvoices = await prisma.invoice.findMany({
    where: { status: "OVERDUE", dueDate: { lt: cutoff } },
    include: { customer: true },
  });

  const alreadyProcessed = new Set<string>();
  let suspendedCount = 0;

  for (const invoice of overdueInvoices) {
    if (alreadyProcessed.has(invoice.customerId)) continue;
    alreadyProcessed.add(invoice.customerId);

    if (invoice.customer.status === "ACTIVE") {
      await setCustomerStatusCore(invoice.customerId, "SUSPENDED");
      suspendedCount++;

      await logAudit({
        userId: null, // dipicu sistem, bukan staf
        action: "CUSTOMER_SUSPENDED",
        entityType: "Customer",
        entityId: invoice.customerId,
        description: `Pelanggan ${invoice.customer.customerNumber} (${invoice.customer.name}) diisolir OTOMATIS oleh sistem - menunggak sejak ${invoice.dueDate.toLocaleDateString("id-ID")}`,
      });
    }
  }

  return suspendedCount;
}

/**
 * Logic inti pencatatan pembayaran - dipakai baik dari Server Action
 * dashboard (input manual staf) MAUPUN dari webhook Midtrans (pembayaran
 * online otomatis). Tidak ada revalidatePath di sini, sama seperti pola
 * service lain, supaya bisa dipanggil dari webhook (bukan request Next.js
 * biasa) tanpa error.
 */
export async function recordPaymentCore(params: {
  invoiceId: string;
  amount: number;
  method: "TRANSFER" | "VIRTUAL_ACCOUNT" | "QRIS" | "EWALLET" | "CASH";
  referenceId?: string | null;
  // userId diisi kalau dipicu staf dari dashboard; kosongkan (undefined/null)
  // kalau dipicu otomatis dari webhook Midtrans
  userId?: string | null;
  actorLabel?: string; // untuk deskripsi log, misal nama staf atau "Midtrans (otomatis)"
}) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: { payments: true, customer: true },
  });

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan");
  }

  await prisma.payment.create({
    data: {
      invoiceId: params.invoiceId,
      amount: params.amount,
      method: params.method,
      referenceId: params.referenceId || null,
    },
  });

  const totalPaid =
    invoice.payments.reduce((sum, p) => sum + p.amount, 0) + params.amount;
  const isFullyPaid = totalPaid >= invoice.amount + invoice.lateFee;

  if (isFullyPaid) {
    await prisma.invoice.update({
      where: { id: params.invoiceId },
      data: { status: "PAID", paidAt: new Date() },
    });
  }

  await logAudit({
    userId: params.userId,
    action: "PAYMENT_RECORDED",
    entityType: "Invoice",
    entityId: params.invoiceId,
    description: `Pembayaran Rp${params.amount.toLocaleString("id-ID")} (${params.method}) untuk invoice ${invoice.invoiceNumber} dicatat oleh ${params.actorLabel ?? "staf"}${isFullyPaid ? " - LUNAS" : " - sebagian"}`,
  });

  const waMessage = isFullyPaid
    ? `Yth. ${invoice.customer.name},\n\nPembayaran sebesar Rp${params.amount.toLocaleString("id-ID")} untuk invoice ${invoice.invoiceNumber} telah kami terima. Tagihan Anda LUNAS.\n\nTerima kasih.`
    : `Yth. ${invoice.customer.name},\n\nPembayaran sebesar Rp${params.amount.toLocaleString("id-ID")} untuk invoice ${invoice.invoiceNumber} telah kami terima. Sisa tagihan: Rp${Math.max(invoice.amount + invoice.lateFee - totalPaid, 0).toLocaleString("id-ID")}.\n\nTerima kasih.`;

  const waResult = await sendWhatsAppMessage(invoice.customer.phone, waMessage);
  if (!waResult.success) {
    console.error(
      `[WhatsApp] Gagal kirim konfirmasi pembayaran ke ${invoice.customer.name}:`,
      waResult.error,
    );
  }

  return { invoice, isFullyPaid };
}
