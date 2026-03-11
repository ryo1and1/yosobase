import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getCronSecret } from "@/lib/env";
import { runSettlementBatch } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronAuthorized(request: NextRequest): boolean {
  const expected = getCronSecret();
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return bearer === expected || isAdminAuthorized(request);
}

export async function POST(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const totals = await runSettlementBatch();
    return NextResponse.json({ ok: true, totals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to settle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
