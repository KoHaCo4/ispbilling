import { auth } from "@/auth";
import { getInvoiceGenerationStatus } from "@/lib/billing-generation-status";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getInvoiceGenerationStatus();
  return NextResponse.json(status, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
