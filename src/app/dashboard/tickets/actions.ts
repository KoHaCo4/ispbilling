"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createTicket(formData: FormData) {
  const customerId = formData.get("customerId") as string;
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as
    | "LOW"
    | "MEDIUM"
    | "HIGH"
    | "CRITICAL";

  if (!customerId || !subject || !description) {
    throw new Error("Field wajib belum lengkap");
  }

  const ticket = await prisma.ticket.create({
    data: {
      customerId,
      subject,
      description,
      priority: priority || "MEDIUM",
      status: "OPEN",
    },
  });

  revalidatePath("/dashboard/tickets");
  redirect(`/dashboard/tickets/${ticket.id}`);
}

export async function updateTicketStatus(
  ticketId: string,
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED",
) {
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      ...(status === "RESOLVED" && { resolvedAt: new Date() }),
    },
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
}

export async function assignTicket(ticketId: string, assigneeId: string) {
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assigneeId: assigneeId || null,
      // Kalau ditugaskan ke teknisi dan masih OPEN, otomatis pindah ke IN_PROGRESS
      status: assigneeId ? "IN_PROGRESS" : undefined,
    },
  });

  revalidatePath(`/dashboard/tickets/${ticketId}`);
  revalidatePath("/dashboard/tickets");
}
