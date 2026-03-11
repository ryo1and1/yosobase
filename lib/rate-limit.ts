import { createServiceClient } from "@/lib/supabase";

type Bucket = {
  count: number;
  resetAt: number;
};

const fallbackBuckets = new Map<string, Bucket>();

function fallbackCheckRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = fallbackBuckets.get(key);
  if (!current || current.resetAt <= now) {
    fallbackBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) {
    return false;
  }
  current.count += 1;
  fallbackBuckets.set(key, current);
  return true;
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: key,
      p_limit: limit,
      p_window_ms: windowMs
    });

    if (error) {
      console.error("check_rate_limit rpc failed, falling back to local limiter", error);
      return fallbackCheckRateLimit(key, limit, windowMs);
    }

    return Boolean(data);
  } catch (error) {
    console.error("check_rate_limit fallback triggered", error);
    return fallbackCheckRateLimit(key, limit, windowMs);
  }
}
