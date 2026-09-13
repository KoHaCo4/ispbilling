import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/sidebar";
import Topbar from "@/components/dashboard/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Lapisan kedua selain middleware - jaga-jaga kalau layout ini
  // diakses tanpa lewat middleware (misal saat testing/prefetch)
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-warm-paper">
      <Sidebar role={session.user.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar name={session.user.name ?? "Staf"} role={session.user.role} />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
