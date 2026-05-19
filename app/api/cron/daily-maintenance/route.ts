import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { syncNpbMonthlyGames } from "@/lib/npb-sync";
import { runSettlementBatch } from "@/lib/settlement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SyncTarget = {
  year: number;
  month: number;
  targetDates: string[];
};

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

function makeTomorrowTarget(): SyncTarget {
  const tomorrow = getJstDateParts(new Date(Date.now() + 24 * 60 * 60 * 1000));
  return {
    year: tomorrow.year,
    month: tomorrow.month,
    targetDates: [tomorrow.dateKey]
  };
}

function makeRecentResultTargets(daysBack: number): SyncTarget[] {
  const grouped = new Map<string, SyncTarget>();

  for (let offset = 0; offset <= daysBack; offset += 1) {
    const target = getJstDateParts(new Date(Date.now() - offset * 24 * 60 * 60 * 1000));
    const key = `${target.year}-${String(target.month).padStart(2, "0")}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.targetDates = Array.from(new Set([...existing.targetDates, target.dateKey])).sort();
      continue;
    }

    grouped.set(key, {
      year: target.year,
      month: target.month,
      targetDates: [target.dateKey]
    });
  }

  return Array.from(grouped.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

async function handleCronRequest(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const tomorrowTarget = makeTomorrowTarget();
    const tomorrowSync = await syncNpbMonthlyGames({ ...tomorrowTarget, mode: "schedule_only" });
    const resultsSync = [];
    for (const target of makeRecentResultTargets(2)) {
      const summary = await syncNpbMonthlyGames({ ...target, mode: "results_only" });
      resultsSync.push(summary);
    }
    const settle = await runSettlementBatch();

    return NextResponse.json({
      ok: true,
      steps: {
        tomorrow_sync: tomorrowSync,
        results_sync: resultsSync,
        settle
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to run daily maintenance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}
