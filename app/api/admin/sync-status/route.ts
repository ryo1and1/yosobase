import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { fetchLatestSyncLogBySource } from "@/lib/sync-log";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const [npbSync, settle] = await Promise.all([
      fetchLatestSyncLogBySource("npb-sync"),
      fetchLatestSyncLogBySource("settle")
    ]);

    return NextResponse.json({
      npb_sync: npbSync,
      settle
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to fetch sync status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
