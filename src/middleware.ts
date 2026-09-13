import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

// Instance auth khusus untuk middleware - HANYA pakai config edge-safe,
// tidak menyentuh Prisma/bcrypt sama sekali
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  // Kalau belum login dan coba akses dashboard -> redirect ke login
  if (isOnDashboard && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Kalau sudah login dan buka halaman login -> redirect ke dashboard
  if (isOnLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  // Proteksi berbasis role: ADMIN, FINANCE, & COLLECTOR yang boleh akses /dashboard/billing
  const role = req.auth?.user?.role;
  if (
    req.nextUrl.pathname.startsWith("/dashboard/billing") &&
    role !== "ADMIN" &&
    role !== "FINANCE" &&
    role !== "COLLECTOR"
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
