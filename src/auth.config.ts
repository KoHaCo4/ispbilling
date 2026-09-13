import type { NextAuthConfig } from "next-auth";

// Config ini HARUS edge-safe - jangan import Prisma, bcrypt, atau library
// Node.js lain di sini. File ini dipakai langsung oleh middleware.ts
// yang berjalan di Edge Runtime.
export default {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [], // providers sebenarnya (Credentials) didaftarkan di auth.ts, bukan di sini
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // token.id & token.role dipastikan selalu terisi karena callback jwt
        // di atas selalu mengisinya duluan sebelum session callback jalan.
        // Non-null assertion di sini aman - bukan asumsi, tapi fakta alur kode.
        session.user.id = token.id!;
        session.user.role = token.role!;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
