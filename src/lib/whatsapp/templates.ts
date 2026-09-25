// Template pesan WA untuk notifikasi invoice - dipakai bareng oleh
// generateMonthlyInvoicesCore, markOverdueInvoicesCore, dan recordPaymentCore
// di invoice-service.ts, supaya format & identitas usaha konsisten di satu
// tempat saja (bukan diketik ulang 3x).
//
// Info usaha (nama, alamat, nomor WA CS/Support) diambil dari env var -
// tinggal edit .env kalau ada yang berubah, tidak perlu ubah kode.

const COMPANY_NAME = process.env.COMPANY_NAME ?? "";
const COMPANY_TAGLINE = process.env.COMPANY_TAGLINE ?? "";
const COMPANY_HASHTAG = process.env.COMPANY_HASHTAG ?? "";
const COMPANY_ADDRESS = process.env.COMPANY_ADDRESS ?? "";
const CS_WA_NUMBER = process.env.CS_WA_NUMBER ?? "";
const SUPPORT_WA_NUMBER = process.env.SUPPORT_WA_NUMBER ?? "";

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

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", { dateStyle: "long" });
}

// Gabung beberapa "blok" pesan (tiap blok boleh multi-baris) dengan 1 baris
// kosong sebagai pemisah - blok yang isinya string kosong ("") otomatis
// dilewati, supaya misalnya paymentSection yang kosong (link gagal dibuat)
// tidak menyisakan baris kosong dobel.
function buildMessage(sections: string[]): string {
  return sections.filter((s) => s.trim().length > 0).join("\n\n");
}

function contactSection(): string {
  const lines = ["Untuk informasi lainnya silahkan hubungi nomor Whatsapp", ""];
  if (CS_WA_NUMBER) {
    lines.push(`https://wa.me/${CS_WA_NUMBER}`, "untuk Customer Service");
  }
  if (SUPPORT_WA_NUMBER) {
    lines.push(`https://wa.me/${SUPPORT_WA_NUMBER}`, "untuk Support Gangguan");
  }
  return lines.length > 2 ? lines.join("\n") : "";
}

function signatureSection(): string {
  const lines = ["Salam Hormat"];
  if (COMPANY_NAME) lines.push(COMPANY_NAME);
  if (COMPANY_TAGLINE) lines.push(COMPANY_TAGLINE);
  if (COMPANY_HASHTAG) lines.push(COMPANY_HASHTAG);
  if (COMPANY_ADDRESS) lines.push(COMPANY_ADDRESS);
  return lines.join("\n");
}

const FOOTER_DISCLAIMER =
  "_Ini adalah pesan otomatis - mohon untuk tidak membalas langsung ke pesan ini_";

function itemLine(pppoeUsername: string | null, packageName: string): string {
  return pppoeUsername
    ? `Internet ${pppoeUsername} - ${packageName}`
    : packageName;
}

export function buildInvoiceCreatedMessage(params: {
  customerName: string;
  customerNumber: string;
  invoiceNumber: string;
  pppoeUsername: string | null;
  packageName: string;
  amount: number;
  periodMonth: number;
  periodYear: number;
  dueDate: Date;
  paymentUrl: string | null;
}): string {
  const details = [
    `ID Pelanggan: ${params.customerNumber}`,
    `Nomor Invoice: ${params.invoiceNumber}`,
    `Item: ${itemLine(params.pppoeUsername, params.packageName)}`,
    `Total: ${formatRupiah(params.amount)}`,
    `Periode: ${monthNames[params.periodMonth - 1]} ${params.periodYear}`,
    `Jatuh tempo: ${formatDate(params.dueDate)}`,
  ].join("\n");

  const paymentSection = params.paymentUrl
    ? `*Metode Pembayaran Otomatis*\nBank Virtual Account, OVO, DANA, LinkAja, ShopeePay, Alfamart, QRIS\nKlik => ${params.paymentUrl}`
    : "";

  return buildMessage([
    `Salam ${params.customerName}`,
    "Kami informasikan invoice Anda telah terbit dan dapat dibayarkan, berikut rinciannya:",
    details,
    "Mohon segera lakukan pembayaran sebelum jatuh tempo, agar internet Anda tidak terisolir.",
    paymentSection,
    contactSection(),
    signatureSection(),
    FOOTER_DISCLAIMER,
  ]);
}

export function buildOverdueReminderMessage(params: {
  customerName: string;
  amount: number;
  paymentUrl: string | null;
}): string {
  const paymentSection = params.paymentUrl
    ? `*Metode Pembayaran Otomatis*\nBank Virtual Account, OVO, DANA, LinkAja, ShopeePay, Alfamart, QRIS\nKlik => ${params.paymentUrl}`
    : "";

  return buildMessage([
    `Salam ${params.customerName}`,
    `Kami informasikan tagihan Anda senilai ${formatRupiah(params.amount)} belum dibayar, mohon segera lakukan pembayaran sebelum akun Anda terisolir.\nAbaikan pesan ini bila sudah membayar.`,
    paymentSection,
    contactSection(),
    signatureSection(),
    FOOTER_DISCLAIMER,
  ]);
}

export function buildPaymentConfirmationMessage(params: {
  customerName: string;
  customerNumber: string;
  invoiceNumber: string;
  pppoeUsername: string | null;
  packageName: string;
  periodMonth: number;
  periodYear: number;
  paymentMethod: string;
  isFullyPaid: boolean;
  amountPaid: number;
  remainingBalance: number;
}): string {
  const details = [
    `ID Pelanggan: ${params.customerNumber}`,
    `Nomor Invoice: ${params.invoiceNumber}`,
    `Item: ${itemLine(params.pppoeUsername, params.packageName)}`,
    `Periode: ${monthNames[params.periodMonth - 1]} ${params.periodYear}`,
    `Jumlah Dibayar: ${formatRupiah(params.amountPaid)}`,
    `Status: ${params.isFullyPaid ? "Lunas" : "Sebagian"}`,
    ...(!params.isFullyPaid
      ? [`Sisa Tagihan: ${formatRupiah(params.remainingBalance)}`]
      : []),
    `Metode Pembayaran: ${params.paymentMethod}`,
  ].join("\n");

  return buildMessage([
    `Kepada Yth. ${params.customerName}`,
    "Terima kasih atas pembayaran tagihan Anda, berikut rinciannya:",
    details,
    contactSection(),
    signatureSection(),
    FOOTER_DISCLAIMER,
  ]);
}
