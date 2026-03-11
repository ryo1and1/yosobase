import { createClient } from "@supabase/supabase-js";
import { getAnonKey, getServiceRoleKey, getSupabaseUrl } from "@/lib/env";

export function createAnonClient() {
  return createClient(getSupabaseUrl(), getAnonKey(), {
    auth: { persistSession: false }
  });
}

export function createServiceClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: { persistSession: false }
  });
}
