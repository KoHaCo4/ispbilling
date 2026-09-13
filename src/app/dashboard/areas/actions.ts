"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createArea(formData: FormData) {
  const name = formData.get("name") as string;
  const district = formData.get("district") as string;
  const regency = formData.get("regency") as string;
  const technicianId = formData.get("technicianId") as string;

  if (!name || !district || !regency) {
    throw new Error("Field wajib belum lengkap");
  }

  await prisma.area.create({
    data: {
      name,
      district,
      regency,
      technicianId: technicianId || null,
    },
  });

  revalidatePath("/dashboard/areas");
  redirect("/dashboard/areas");
}

export async function updateArea(areaId: string, formData: FormData) {
  const name = formData.get("name") as string;
  const district = formData.get("district") as string;
  const regency = formData.get("regency") as string;
  const technicianId = formData.get("technicianId") as string;

  if (!name || !district || !regency) {
    throw new Error("Field wajib belum lengkap");
  }

  await prisma.area.update({
    where: { id: areaId },
    data: {
      name,
      district,
      regency,
      technicianId: technicianId || null,
    },
  });

  revalidatePath("/dashboard/areas");
  revalidatePath(`/dashboard/areas/${areaId}`);
  redirect("/dashboard/areas");
}
