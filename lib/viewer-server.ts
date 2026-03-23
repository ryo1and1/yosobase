import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const getRequestViewer = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  return user;
});

// Use this only from Server Components / layouts to share one auth lookup
// across the same request render without changing the UI contract.
export const getRequestViewerUserId = cache(async (): Promise<string | null> => {
  return (await getRequestViewer())?.id ?? null;
});
