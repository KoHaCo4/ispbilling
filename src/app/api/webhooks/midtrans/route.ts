import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { recordPaymentCore } from "@/services/invoice-service";

type MidtransNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  transaction_id: string;
  payment_type: string;
  fraud_status?: string;
};

function verifySignature(notif: MidtransNotification): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? "";
  const expected = crypto
    .createHash("sha512")
    .update(notif.order_id + notif.status_code + notif.gross_amount + serverKey)
    .digest("hex");

  return expected === notif.signature_key;
}

function mapPaymentMethod(
  paymentType: string,
): "TRANSFER" | "VIRTUAL_ACCOUNT" | "QRIS" | "EWALLET" | "CASH" {
  if (paymentType.includes("bank_transfer") || paymentType === "echannel") {
    return "VIRTUAL_ACCOUNT";
  }
  if (paymentType === "qris") return "QRIS";
  if (paymentType === "gopay" || paymentType === "shopeepay") return "EWALLET";
  return "TRANSFER";
}

export async function POST(req: NextRequest) {
  const notif = (await req.json()) as MidtransNotification;

  // WAJIB verifikasi signature - tanpa ini, siapapun bisa kirim POST palsu
  // ke endpoint ini dan pura-pura invoice sudah dibayar
  if (!verifySignature(notif)) {
    console.error("[Midtrans Webhook] Signature tidak valid, request ditolak");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const isPaid =
    notif.transaction_status === "settlement" ||
    (notif.transaction_status === "capture" && notif.fraud_status === "accept");

  if (!isPaid) {
    // Status lain (pending, deny, cancel, expire) - cukup di-ack, tidak perlu diproses
    return NextResponse.json({ received: true });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { invoiceNumber: notif.order_id },
  });

  if (!invoice) {
    // Balikin 200 (bukan 404) walau invoice tidak ditemukan - ini penting
    // supaya notifikasi TEST dari Midtrans (order_id-nya dummy/fiktif)
    // tidak dianggap "gagal" oleh Midtrans. Status non-200 cuma dipakai
    // untuk kegagalan verifikasi yang beneran serius (signature invalid).
    console.error(
      `[Midtrans Webhook] Invoice tidak ditemukan: ${notif.order_id}`,
    );
    return NextResponse.json({
      received: true,
      note: "Order ID tidak ditemukan (kemungkinan notifikasi test)",
    });
  }

  if (invoice.status === "PAID") {
    // Sudah PAID sebelumnya (misal Midtrans kirim notifikasi dobel) - aman diabaikan
    return NextResponse.json({ received: true, note: "Already paid" });
  }

  await recordPaymentCore({
    invoiceId: invoice.id,
    amount: Math.round(Number(notif.gross_amount)),
    method: mapPaymentMethod(notif.payment_type),
    referenceId: notif.transaction_id,
    userId: null, // otomatis dari webhook, bukan staf
    actorLabel: "Midtrans (pembayaran online otomatis)",
  });

  console.log(
    `[Midtrans Webhook] Invoice ${notif.order_id} dibayar via ${notif.payment_type}`,
  );

  return NextResponse.json({ received: true });
}
