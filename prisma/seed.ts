import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // ==========================================
  // 1. USER ADMIN
  // ==========================================
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ispbilling.com" },
    update: {},
    create: {
      name: "Admin Utama",
      email: "admin@ispbilling.com",
      password: hashedPassword,
      role: "ADMIN",
      phone: "081234567890",
    },
  });
  console.log("User admin dibuat:", admin.email);

  // ==========================================
  // 2. AREA (5 DESA)
  // ==========================================
  const areaNames = [
    { name: "Desa Sukamaju", district: "Kec. Sukoharjo", regency: "Kab. Pati" },
    { name: "Desa Makmur", district: "Kec. Sukoharjo", regency: "Kab. Pati" },
    {
      name: "Desa Sejahtera",
      district: "Kec. Margorejo",
      regency: "Kab. Pati",
    },
    {
      name: "Desa Karya Bakti",
      district: "Kec. Margorejo",
      regency: "Kab. Pati",
    },
    { name: "Desa Tani Jaya", district: "Kec. Gembong", regency: "Kab. Pati" },
  ];

  const areas = [];
  for (const a of areaNames) {
    // cek dulu biar seed aman dijalankan berkali-kali (idempotent)
    let area = await prisma.area.findFirst({ where: { name: a.name } });
    if (!area) {
      area = await prisma.area.create({
        data: {
          name: a.name,
          district: a.district,
          regency: a.regency,
        },
      });
      console.log("Area dibuat:", area.name);
    } else {
      console.log("Area sudah ada, dilewati:", area.name);
    }
    areas.push(area);
  }

  // ==========================================
  // 3. ROUTER (1 MIKROTIK PER DESA)
  // ==========================================
  // NOTE: ip_address di bawah cuma placeholder untuk data awal.
  // Ganti ke IP Mikrotik asli tiap desa saat sudah siap sinkronisasi RouterOS API.
  for (const area of areas) {
    const existing = await prisma.router.findFirst({
      where: { areaId: area.id },
    });
    if (!existing) {
      const router = await prisma.router.create({
        data: {
          name: `BRAS-${area.name}`,
          ipAddress: "192.168.88.1", // placeholder, ganti sesuai IP asli
          apiPort: 8728,
          apiUsername: "admin",
          apiPassword: "changeme", // placeholder, enkripsi di application layer nanti
          areaId: area.id,
        },
      });
      console.log("Router dibuat:", router.name);
    } else {
      console.log("Router sudah ada untuk area, dilewati:", area.name);
    }
  }

  // ==========================================
  // 4. PACKAGE (PAKET INTERNET)
  // ==========================================
  const packageData = [
    { name: "Paket Hemat 10 Mbps", speedMbps: 10, price: 100000 },
    { name: "Paket Standar 20 Mbps", speedMbps: 20, price: 165000 },
    { name: "Paket Keluarga 35 Mbps", speedMbps: 35, price: 250000 },
    { name: "Paket Bisnis 50 Mbps", speedMbps: 50, price: 350000 },
  ];

  for (const p of packageData) {
    let pkg = await prisma.package.findFirst({ where: { name: p.name } });
    if (!pkg) {
      pkg = await prisma.package.create({
        data: {
          name: p.name,
          speedMbps: p.speedMbps,
          price: p.price,
        },
      });
      console.log("Package dibuat:", pkg.name);
    } else {
      console.log("Package sudah ada, dilewati:", pkg.name);
    }
  }

  console.log("\nSeeding selesai!");
  console.log(
    "Login admin -> email: admin@ispbilling.com | password: admin123",
  );
  console.log("PENTING: ganti password admin ini setelah login pertama kali.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
