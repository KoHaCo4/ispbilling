import "dotenv/config";
import { prisma } from "../lib/prisma";
import { encrypt, decrypt } from "../lib/crypto";

/**
 * Script SEKALI JALAN untuk enkripsi apiPassword router yang masih plaintext
 * (dari data seed sebelumnya). Aman dijalankan berkali-kali - kalau password
 * sudah dalam format terenkripsi (bisa di-decrypt), akan dilewati.
 *
 * Jalankan: npx tsx src/scripts/encrypt-existing-passwords.ts
 */
async function main() {
  const routers = await prisma.router.findMany();

  let encrypted = 0;
  let skipped = 0;

  for (const router of routers) {
    // Cek apakah sudah terenkripsi dengan cara coba decrypt - kalau berhasil,
    // berarti sudah dalam format terenkripsi, skip
    try {
      decrypt(router.apiPassword);
      console.log(`Sudah terenkripsi, dilewati: ${router.name}`);
      skipped++;
      continue;
    } catch {
      // Gagal decrypt = masih plaintext, lanjut enkripsi
    }

    const encryptedPassword = encrypt(router.apiPassword);
    await prisma.router.update({
      where: { id: router.id },
      data: { apiPassword: encryptedPassword },
    });

    console.log(`Berhasil dienkripsi: ${router.name}`);
    encrypted++;
  }

  console.log(
    `\nSelesai. Dienkripsi: ${encrypted}, dilewati (sudah aman): ${skipped}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
