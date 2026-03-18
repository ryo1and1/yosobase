import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { runSettlementBatch } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const totals = await runSettlementBatch();
    return NextResponse.json({ ok: true, totals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to settle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
