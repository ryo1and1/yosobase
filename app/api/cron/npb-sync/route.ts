import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getCronSecret } from "@/lib/env";
import { syncNpbMonthlyGames } from "@/lib/npb-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type YearMonth = {
  year: number;
  month: number;
};

type SyncMode = "full" | "results_only";

function isCronAuthorized(request: NextRequest): boolean {
  const expected = getCronSecret();
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return bearer === expected || isAdminAuthorized(request);
}

function readInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function getJstYearMonth(date: Date): YearMonth {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = Number.parseInt(parts.find((part) => part.type === "year")?.value ?? "", 10);
  const month = Number.parseInt(parts.find((part) => part.type === "month")?.value ?? "", 10);
  return { year, month };
}

function listWindowMonths(daysAhead: number): YearMonth[] {
  const targets: YearMonth[] = [];
  const seen = new Set<string>();

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const target = getJstYearMonth(new Date(Date.now() + offset * 24 * 60 * 60 * 1000));
    const key = `${target.year}-${String(target.month).padStart(2, "0")}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    targets.push(target);
  }

  return targets;
}

function listCurrentAndPreviousMonth(): YearMonth[] {
  const now = new Date();
  const previous = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
  const months = [getJstYearMonth(previous), getJstYearMonth(now)];
  const seen = new Set<string>();
  return months.filter((month) => {
    const key = `${month.year}-${String(month.month).padStart(2, "0")}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function makeTargetList(request: NextRequest, mode: SyncMode): YearMonth[] {
  const yearParam = readInteger(request.nextUrl.searchParams.get("year"));
  const monthParam = readInteger(request.nextUrl.searchParams.get("month"));
  if (yearParam !== null || monthParam !== null) {
    if (yearParam === null || monthParam === null) {
      throw new Error("year and month must be provided together");
    }
    return [{ year: yearParam, month: monthParam }];
  }

  if (mode === "results_only") {
    return listCurrentAndPreviousMonth();
  }
  return listWindowMonths(7);
}

function parseSyncMode(request: NextRequest): SyncMode {
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode === "results" || mode === "results_only") {
    return "results_only";
  }
  return "full";
}

export async function POST(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const mode = parseSyncMode(request);
    const targets = makeTargetList(request, mode);
    const summaries = [];
    for (const target of targets) {
      const summary = await syncNpbMonthlyGames({ ...target, mode });
      summaries.push(summary);
    }

    return NextResponse.json({ ok: true, summaries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to sync npb data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
