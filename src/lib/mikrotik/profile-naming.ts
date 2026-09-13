/**
 * Konversi nama Package jadi nama PPP Profile yang valid & konsisten di
 * Mikrotik. Dipakai di SEMUA tempat yang berurusan dengan profile, supaya
 * "Paket Hemat 10 Mbps" selalu menghasilkan nama profile yang sama persis
 * di manapun dipanggil.
 */
export function getMikrotikProfileName(packageName: string): string {
  return packageName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Tentukan nama profile final yang dipakai untuk sebuah Package - pakai
 * mapping manual (mikrotikProfile) kalau staf sudah isi (biasanya karena
 * ISP sudah punya profile dengan nama tertentu duluan di Mikrotik),
 * kalau kosong baru fallback ke auto-generate dari nama paket.
 */
export function resolveMikrotikProfileName(pkg: {
  name: string;
  mikrotikProfile: string | null;
}): string {
  return pkg.mikrotikProfile?.trim() || getMikrotikProfileName(pkg.name);
}

/**
 * Parse string rate-limit Mikrotik (misal "10M/10M" atau "5M/10M 15M/20M")
 * jadi angka Mbps perkiraan - dipakai saat import Package dari profile yang
 * sudah ada di Mikrotik, supaya field speed bisa auto-terisi (staf tetap
 * bisa koreksi manual kalau parsing-nya meleset).
 */
export function parseRateLimitToMbps(rateLimit: string): number | null {
  const firstToken = rateLimit.trim().split(" ")[0]; // ambil bagian sebelum burst-limit
  const match = firstToken.match(
    /^(\d+(?:\.\d+)?)([kKmMgG])?\/(\d+(?:\.\d+)?)([kKmMgG])?$/,
  );

  if (!match) return null;

  const toMbps = (value: string, unit: string | undefined) => {
    const num = parseFloat(value);
    if (!unit) return num / 1_000_000; // asumsi satuan dasar bps kalau tanpa suffix
    const u = unit.toLowerCase();
    if (u === "k") return num / 1000;
    if (u === "g") return num * 1000;
    return num; // "m" = sudah Mbps
  };

  const upload = toMbps(match[1], match[2]);
  const download = toMbps(match[3], match[4]);

  return Math.round(Math.max(upload, download));
}
