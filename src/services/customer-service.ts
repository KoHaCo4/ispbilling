import { prisma } from "@/lib/prisma";
import { setPppoeSecretEnabled } from "@/lib/mikrotik/pppoe";
import { getDecryptedRouterCredentials } from "@/lib/mikrotik/credentials";
import { sendWhatsAppMessage } from "@/lib/whatsapp/fonnte";

export async function setCustomerStatusCore(
  customerId: string,
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE" | "PENDING",
) {
  const now = new Date();

  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: {
      status,
      ...(status === "ACTIVE" && { activatedAt: now, suspendedAt: null }),
      ...(status === "SUSPENDED" && { suspendedAt: now }),
    },
    include: { router: true },
  });

  if (
    customer.pppoeUsername &&
    (status === "ACTIVE" || status === "SUSPENDED")
  ) {
    const result = await setPppoeSecretEnabled(
      getDecryptedRouterCredentials(customer.router),
      customer.pppoeUsername,
      status === "ACTIVE",
    );

    if (!result.success) {
      console.error(
        `[Mikrotik] Gagal ${status === "ACTIVE" ? "mengaktifkan" : "isolir"} ${customer.customerNumber}:`,
        result.error,
      );
    }
  }

  // Notifikasi WhatsApp - kegagalan kirim tidak membatalkan perubahan status
  if (status === "SUSPENDED") {
    const waResult = await sendWhatsAppMessage(
      customer.phone,
      `Yth. ${customer.name},\n\nLayanan internet Anda saat ini diisolir karena tagihan belum dibayar.\n\nSegera lakukan pembayaran agar layanan dapat diaktifkan kembali.\n\nTerima kasih.`,
    );
    if (!waResult.success) {
      console.error(
        `[WhatsApp] Gagal kirim notifikasi isolir ke ${customer.name}:`,
        waResult.error,
      );
    }
  } else if (status === "ACTIVE") {
    const waResult = await sendWhatsAppMessage(
      customer.phone,
      `Yth. ${customer.name},\n\nLayanan internet Anda telah aktif kembali. Selamat menikmati layanan kami.\n\nTerima kasih.`,
    );
    if (!waResult.success) {
      console.error(
        `[WhatsApp] Gagal kirim notifikasi aktivasi ke ${customer.name}:`,
        waResult.error,
      );
    }
  }

  return customer;
}
