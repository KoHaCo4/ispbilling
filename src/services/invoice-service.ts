import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { setCustomerStatusCore } from "./customer-service";
import { sendWhatsAppMessage } from "@/lib/whatsapp/fonnte";
import { createPaymentLink } from "@/lib/midtrans";
import { logAudit } from "@/lib/audit";

// Dipakai juga oleh worker/index.ts untuk job auto-suspend-overdue - taruh
// di sini (bukan di worker) supaya generateMonthlyInvoicesCore bisa pakai
// angka yang SAMA PERSIS untuk menghitung sampai kapan link pembayaran
// Midtrans harus tetap valid (lihat pemakaiannya di bawah).
export const GRACE_DAYS_BEFORE_SUSPEND = 7; // jumlah hari toleransi sebelum auto-isolir

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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Jeda acak antara 2 angka (inklusif) dalam milidetik - dipakai antar
// pengiriman WA supaya polanya tidak terlalu mekanis/gampang dikenali
// sebagai bot (selalu persis N detik).
function randomDelayMs(minMs: number, maxMs: number) {
  return Math.floor(minMs + Math.random() * (maxMs - minMs));
}

const WA_SEND_DELAY_MIN_MS = 30_000; // 30 detik
const WA_SEND_DELAY_MAX_MS = 60_000; // 60 detik

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
  let notified = 0;

  for (let i = 0; i < activeCustomers.length; i++) {
    const customer = activeCustomers[i];

    let invoice = await prisma.invoice.findFirst({
      where: { customerId: customer.id, periodMonth, periodYear },
    });

    // Invoice sudah ada DAN notifikasinya sudah pernah sukses terkirim -
    // benar-benar tidak ada yang perlu dikerjakan lagi untuk pelanggan ini.
    if (invoice && invoice.notificationSentAt) {
      skipped++;
      continue;
    }

    if (!invoice) {
      const override = await prisma.areaPackagePrice.findUnique({
        where: {
          areaId_packageId: {
            areaId: customer.areaId,
            packageId: customer.packageId,
          },
        },
      });

      const amount = override?.price ?? customer.package.price;
      const invoiceNumber = await generateInvoiceNumber(
        periodMonth,
        periodYear,
      );
      const dueDate = new Date(periodYear, periodMonth - 1, 10);

      // Link pembayaran harus tetap valid setidaknya sampai pelanggan
      // beresiko diisolir (dueDate + masa tenggang) - bukan cuma 24 jam
      // default Midtrans, karena jatuh tempo invoice ini baru tanggal 10,
      // jauh lebih dari 24 jam sejak invoice terbit tanggal 1.
      const paymentLinkValidUntil = new Date(dueDate);
      paymentLinkValidUntil.setDate(
        paymentLinkValidUntil.getDate() + GRACE_DAYS_BEFORE_SUSPEND,
      );
      const paymentLinkExpiryDays = Math.max(
        1,
        Math.ceil(
          (paymentLinkValidUntil.getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      );

      // Generate link pembayaran online SEBELUM invoice disimpan, supaya
      // paymentUrl bisa langsung diisi dalam satu create (bukan create lalu update)
      const paymentLinkResult = await createPaymentLink({
        orderId: invoiceNumber,
        grossAmount: amount,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        expiryDurationDays: paymentLinkExpiryDays,
      });

      if (!paymentLinkResult.success) {
        console.error(
          `[Midtrans] Gagal generate link pembayaran untuk ${invoiceNumber}:`,
          paymentLinkResult.error,
        );
      }

      invoice = await prisma.invoice
        .create({
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
        })
        .catch(async (err) => {
          // Kemungkinan proses ini ke-trigger 2x bersamaan (misal tombol
          // manual diklik dua kali) dan run "lain" barusan lebih dulu bikin
          // invoice untuk pelanggan+periode yang sama - bukan error asli,
          // cukup pakai invoice yang sudah dibuat run lain itu.
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === "P2002"
          ) {
            const raceWinner = await prisma.invoice.findFirst({
              where: { customerId: customer.id, periodMonth, periodYear },
            });
            if (raceWinner) return raceWinner;
          }
          throw err;
        });

      created++;
    }
    // else: invoice sudah ada dari run sebelumnya tapi notificationSentAt
    // masih kosong (kemungkinan run sebelumnya terhenti tepat di antara
    // invoice dibuat dan WA terkirim) - lanjut ke pengiriman WA di bawah
    // tanpa bikin invoice baru/duplikat.

    const paymentLine = invoice.paymentUrl
      ? `\n\nBayar online: ${invoice.paymentUrl}`
      : "";

    const waResult = await sendWhatsAppMessage(
      customer.phone,
      `Yth. ${customer.name},\n\nTagihan internet periode ${monthNames[periodMonth - 1]} ${periodYear} sebesar Rp${invoice.amount.toLocaleString("id-ID")} telah terbit.\nJatuh tempo: ${invoice.dueDate.toLocaleDateString("id-ID", { dateStyle: "long" })}.\n\nNo. Invoice: ${invoice.invoiceNumber}${paymentLine}\n\nTerima kasih.`,
    );

    if (waResult.success) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { notificationSentAt: new Date() },
      });
      notified++;
    } else {
      console.error(
        `[WhatsApp] Gagal kirim notifikasi invoice ke ${customer.name}:`,
        waResult.error,
      );
    }

    // Jeda antar pengiriman WA supaya tidak dianggap pola spam/broadcast
    // oleh WhatsApp - dilewati untuk pelanggan terakhir karena tidak ada
    // lagi kiriman berikutnya yang perlu ditunggu.
    if (i < activeCustomers.length - 1) {
      await delay(randomDelayMs(WA_SEND_DELAY_MIN_MS, WA_SEND_DELAY_MAX_MS));
    }
  }

  return { created, skipped, notified, total: activeCustomers.length };
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
