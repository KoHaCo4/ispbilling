import { auth } from "@/auth";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell role={session.user.role} name={session.user.name ?? "Staf"}>
      {children}
    </DashboardShell>
  );
}
