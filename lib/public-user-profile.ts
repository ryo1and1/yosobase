import type { SupabaseClient, User } from "@supabase/supabase-js";

function normalizeDisplayName(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function displayNameFromEmail(email: string | null | undefined): string {
  const localPart = email?.split("@")[0]?.trim() ?? "";
  return localPart || "ユーザー";
}

function sanitizeFavoriteTeamId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

async function resolveFavoriteTeamId(supabase: SupabaseClient, value: string | null): Promise<string | null> {
  if (!value) {
    return null;
  }

  const { data, error } = await supabase.from("teams").select("id").eq("id", value).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function findUserIdByEmail(supabase: SupabaseClient, email: string | null | undefined): Promise<string | null> {
  if (!email) {
    return null;
  }

  const { data, error } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

export async function ensurePublicUserProfile(supabase: SupabaseClient, user: User): Promise<void> {
  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingUserError) {
    throw new Error(existingUserError.message);
  }
  if (existingUser) {
    return;
  }

  const metadata = typeof user.user_metadata === "object" && user.user_metadata ? user.user_metadata : {};
  const rawDisplayName = normalizeDisplayName(String(metadata.display_name ?? ""));
  const favoriteTeamId = await resolveFavoriteTeamId(supabase, sanitizeFavoriteTeamId(metadata.favorite_team_id));
  const draft = {
    id: user.id,
    email: user.email ?? null,
    display_name: rawDisplayName || displayNameFromEmail(user.email),
    favorite_team_id: favoriteTeamId
  };

  const { error: insertError } = await supabase.from("users").insert(draft);

  if (!insertError || insertError.code === "23505") {
    const duplicateEmailUserId = await findUserIdByEmail(supabase, user.email);
    if (duplicateEmailUserId && duplicateEmailUserId !== user.id) {
      const { data: duplicateById } = await supabase.from("users").select("id").eq("id", user.id).maybeSingle();
      if (!duplicateById) {
        const { error: retryError } = await supabase.from("users").insert({
          ...draft,
          email: null
        });

        if (retryError && retryError.code !== "23505") {
          throw new Error(retryError.message);
        }
      }
    }
    return;
  }

  if (insertError) {
    throw new Error(insertError.message);
  }
}
