export type WhatsAppResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Kirim pesan WhatsApp lewat Fonnte API.
 * Butuh FONNTE_TOKEN di .env - ambil dari menu "Device" di dashboard Fonnte.
 *
 * Nomor HP boleh format lokal (08xxx) - Fonnte otomatis ganti awalan 0
 * jadi kode negara 62, jadi tidak perlu diformat manual di sini.
 */
export async function sendWhatsAppMessage(
  target: string,
  message: string,
): Promise<WhatsAppResult> {
  const token = process.env.FONNTE_TOKEN;

  if (!token) {
    console.warn(
      "[WhatsApp] FONNTE_TOKEN belum diset di .env - notifikasi dilewati",
    );
    return { success: false, error: "FONNTE_TOKEN belum dikonfigurasi" };
  }

  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ target, message }),
    });

    const data = await response.json();

    if (data.status === false) {
      return { success: false, error: data.reason ?? "Gagal mengirim pesan" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
