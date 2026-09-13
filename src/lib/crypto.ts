import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("ENCRYPTION_KEY belum diset di .env");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY harus 32 byte (64 karakter hex) - generate pakai: openssl rand -hex 32",
    );
  }
  return key;
}

/**
 * Enkripsi teks (misal password API Mikrotik) sebelum disimpan ke database.
 * Hasil format: "iv:authTag:ciphertext" (semua dalam hex), disimpan sebagai
 * satu string utuh di kolom database.
 */
export function encrypt(plainText: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 12 byte direkomendasikan untuk GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

/**
 * Dekripsi teks yang sebelumnya dienkripsi dengan encrypt() di atas.
 * Dipakai tiap kali mau connect ke Mikrotik (password perlu di-decrypt dulu).
 */
export function decrypt(payload: string): string {
  const key = getKey();
  const parts = payload.split(":");

  if (parts.length !== 3) {
    throw new Error(
      "Format data terenkripsi tidak valid - kemungkinan data ini belum dienkripsi (masih plaintext lama)",
    );
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
