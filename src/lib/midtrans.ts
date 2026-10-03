import midtransClient from "midtrans-client";

export type PaymentLinkResult =
  | { success: true; redirectUrl: string; token: string }
  | { success: false; error: string };

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
});

// Cuma Virtual Account (semua bank) + QRIS universal - dua metode yang
// biayanya paling masuk akal ditutup oleh ONLINE_PAYMENT_ADMIN_FEE
// (lihat invoice-service.ts). GoPay/ShopeePay/kartu kredit sengaja
// DIKELUARKAN karena biayanya (2%, 1.5%, 2.9%+Rp2000) bisa jauh lebih
// besar dari Rp2.500 untuk tagihan paket yang lebih mahal.
//
// Sengaja pakai "other_qris" (QRIS generik, bisa discan e-wallet apa saja
// - OVO/DANA/ShopeePay/GoPay dll), BUKAN "gopay" - karena channel "gopay"
// di Snap kadang otomatis beralih ke mode deeplink aplikasi GoPay
// (bukan QRIS) tergantung device pelanggan, yang kena tarif GoPay 2%,
// bukan tarif QRIS.
const ENABLED_PAYMENT_METHODS = [
  "bank_transfer", // alias Midtrans untuk: permata_va, bca_va, bni_va, bri_va, echannel (Mandiri)
  "cimb_va",
  "other_va", // jaring pengaman untuk bank VA lain di luar daftar atas
  "other_qris",
  // "gopay",        // GoPay e-wallet/deeplink - biaya 2%
  // "shopeepay",    // ShopeePay e-wallet/deeplink - biaya 1,5%
  // "credit_card",  // Kartu kredit/debit - biaya 2,9% + Rp2.000
  // "indomaret",    // Bayar tunai di gerai Indomaret
  // "alfamart",     // Bayar tunai di gerai Alfamart (dulu disebut "cstore")
  // "akulaku",      // Paylater Akulaku
];

/**
 * Generate link pembayaran online (Snap) untuk sebuah invoice.
 * orderId HARUS unik di Midtrans - kita pakai invoiceNumber (sudah unique
 * di database) supaya aman.
 *
 * expiryDurationDays: berapa lama link ini valid, dalam hari, dihitung
 * sejak dibuat SEKARANG (bukan dari tanggal invoice terbit). Kalau tidak
 * diisi, pakai default Midtrans sendiri (24 jam) - sengaja dibuat opsional
 * karena tanpa ini link akan expired jauh sebelum tanggal jatuh tempo
 * invoice, membuat link "Bayar online" di pesan WA jadi mati sebelum
 * waktunya.
 */
export async function createPaymentLink(params: {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  expiryDurationDays?: number;
}): Promise<PaymentLinkResult> {
  if (!process.env.MIDTRANS_SERVER_KEY) {
    return { success: false, error: "MIDTRANS_SERVER_KEY belum dikonfigurasi" };
  }

  try {
    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      customer_details: {
        first_name: params.customerName,
        phone: params.customerPhone,
        email: params.customerEmail || undefined,
      },
      enabled_payments: ENABLED_PAYMENT_METHODS,
      // start_time sengaja tidak diisi - default-nya Midtrans hitung dari
      // waktu request ini dibuat, yang memang itu yang kita mau.
      ...(params.expiryDurationDays
        ? {
            expiry: {
              unit: "day" as const,
              duration: Math.max(1, params.expiryDurationDays),
            },
          }
        : {}),
    });

    return {
      success: true,
      redirectUrl: transaction.redirect_url,
      token: transaction.token,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
