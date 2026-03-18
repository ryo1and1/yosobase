import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { syncNpbMonthlyGames } from "@/lib/npb-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncTarget = {
  year: number;
  month: number;
  targetDates?: string[];
};

type SyncMode = "full" | "results_only" | "schedule_only";

function readInteger(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function getJstDateParts(date: Date): { year: number; month: number; dateKey: string } {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = Number.parseInt(parts.find((part) => part.type === "year")?.value ?? "", 10);
  const month = Number.parseInt(parts.find((part) => part.type === "month")?.value ?? "", 10);
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return {
    year,
    month,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${day}`
  };
}

function listWindowMonths(daysAhead: number): SyncTarget[] {
  const targets: SyncTarget[] = [];
  const seen = new Set<string>();

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const target = getJstDateParts(new Date(Date.now() + offset * 24 * 60 * 60 * 1000));
    const key = `${target.year}-${String(target.month).padStart(2, "0")}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    targets.push({ year: target.year, month: target.month });
  }

  return targets;
}

function listCurrentAndPreviousMonth(): SyncTarget[] {
  const now = new Date();
  const previous = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
  const months = [getJstDateParts(previous), getJstDateParts(now)];
  const seen = new Set<string>();
  return months
    .filter((month) => {
      const key = `${month.year}-${String(month.month).padStart(2, "0")}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .map((month) => {
      return { year: month.year, month: month.month };
    });
}

function makeTomorrowTarget(): SyncTarget[] {
  const tomorrow = getJstDateParts(new Date(Date.now() + 24 * 60 * 60 * 1000));
  return [
    {
      year: tomorrow.year,
      month: tomorrow.month,
      targetDates: [tomorrow.dateKey]
    }
  ];
}

function makeTargetList(request: NextRequest, mode: SyncMode): SyncTarget[] {
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
  if (mode === "schedule_only") {
    return makeTomorrowTarget();
  }
  return listWindowMonths(7);
}

function parseSyncMode(request: NextRequest): SyncMode {
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode === "results" || mode === "results_only") {
    return "results_only";
  }
  if (mode === "schedule_only" || mode === "next_day" || mode === "next_day_schedule") {
    return "schedule_only";
  }
  return "full";
}

async function handleCronRequest(request: NextRequest) {
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

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}
