import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";
import readline from "readline";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log("=== Buat Akun Admin Pertama (data asli, bukan dummy) ===\n");

  const name = await ask("Nama: ");
  const email = await ask("Email: ");
  const password = await ask("Password: ");
  const phone = await ask("No. HP (opsional): ");

  if (!name || !email || password.length < 8) {
    console.error("\nData tidak lengkap atau password terlalu pendek. Batal.");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`\nEmail ${email} sudah terdaftar. Batal.`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
      phone: phone || null,
    },
  });

  console.log(
    `\nBerhasil! Akun admin "${admin.name}" (${admin.email}) sudah dibuat.`,
  );
  console.log(
    "Silakan login di aplikasi dan mulai input data Area, Router, dan Paket asli lewat dashboard.",
  );

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
