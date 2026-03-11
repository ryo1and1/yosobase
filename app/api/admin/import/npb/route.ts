import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { syncNpbMonthlyGames } from "@/lib/npb-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportBody = {
  year?: number;
  month?: number;
  mode?: "full" | "results_only";
};

function getCurrentYearMonth(): { year: number; month: number } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit"
  }).format(now);
  const [yearText, monthText] = fmt.split("-");
  return {
    year: Number.parseInt(yearText, 10),
    month: Number.parseInt(monthText, 10)
  };
}

export async function POST(request: NextRequest) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ImportBody;
    const fallback = getCurrentYearMonth();
    const year = Number.isInteger(body.year) ? (body.year as number) : fallback.year;
    const month = Number.isInteger(body.month) ? (body.month as number) : fallback.month;
    const mode = body.mode === "results_only" ? "results_only" : "full";

    const summary = await syncNpbMonthlyGames({ year, month, mode });
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to import npb games";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
