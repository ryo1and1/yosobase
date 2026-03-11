import { createServiceClient } from "@/lib/supabase";

export type SyncLogSource = "npb-sync" | "settle";

export type SyncLogRow = {
  id: string;
  source: string;
  started_at: string;
  finished_at: string | null;
  ok: boolean;
  summary: Record<string, unknown>;
  error: string | null;
  created_at: string;
};

type LogParams = {
  source: SyncLogSource;
  startedAt: Date;
  finishedAt: Date;
  ok: boolean;
  summary?: Record<string, unknown>;
  error?: string | null;
};

export async function writeSyncLog(params: LogParams): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("sync_logs").insert({
    source: params.source,
    started_at: params.startedAt.toISOString(),
    finished_at: params.finishedAt.toISOString(),
    ok: params.ok,
    summary: params.summary ?? {},
    error: params.error ?? null
  });

  if (error) {
    throw new Error(`failed to write sync log: ${error.message}`);
  }
}

export async function fetchLatestSyncLogBySource(source: SyncLogSource): Promise<SyncLogRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("sync_logs")
    .select("id, source, started_at, finished_at, ok, summary, error, created_at")
    .eq("source", source)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to load latest sync log: ${error.message}`);
  }

  return (data as SyncLogRow | null) ?? null;
}
