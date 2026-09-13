import midtransClient from "midtrans-client";

export type PaymentLinkResult =
  | { success: true; redirectUrl: string; token: string }
  | { success: false; error: string };

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY ?? "",
  clientKey: process.env.MIDTRANS_CLIENT_KEY ?? "",
});

/**
 * Generate link pembayaran online (Snap) untuk sebuah invoice.
 * orderId HARUS unik di Midtrans - kita pakai invoiceNumber (sudah unique
 * di database) supaya aman.
 */
export async function createPaymentLink(params: {
  orderId: string;
  grossAmount: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
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
