import { DefaultSession } from "next-auth";

// Augment tipe bawaan NextAuth supaya field `role` dikenali di seluruh project
declare module "next-auth" {
  interface User {
    role: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

// Fallback: next-auth v5 me-re-export tipe dari @auth/core di balik layar.
// Di beberapa versi beta, augmentasi ke "next-auth/jwt" saja tidak cukup
// karena TypeScript menganggapnya modul berbeda dari yang benar-benar
// dipakai secara internal. Augmentasi di sini juga untuk jaga-jaga.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
