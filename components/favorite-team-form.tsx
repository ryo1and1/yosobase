"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Team } from "@/lib/types";

type Props = {
  teams: Team[];
  initialFavoriteTeamId: string | null;
};

type UpdateFavoriteTeamResponse = {
  ok?: boolean;
  favorite_team_id?: string | null;
  error?: string;
};

function toErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

export function FavoriteTeamForm({ teams, initialFavoriteTeamId }: Props) {
  const router = useRouter();
  const [favoriteTeamId, setFavoriteTeamId] = useState(initialFavoriteTeamId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/me/favorite-team", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          favorite_team_id: favoriteTeamId || null
        })
      });

      let payload: UpdateFavoriteTeamResponse | null = null;
      try {
        payload = (await response.json()) as UpdateFavoriteTeamResponse;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        throw new Error(toErrorMessage(payload, "好きな球団の更新に失敗しました。"));
      }

      setMessage("好きな球団を更新しました。");
      startTransition(() => {
        router.refresh();
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "好きな球団の更新に失敗しました。");
    }
  }

  return (
    <form className="profile-favorite-form" onSubmit={onSubmit}>
      <label className="auth-field" htmlFor="favorite-team-select">
        <span>好きな球団を変更</span>
        <select
          id="favorite-team-select"
          value={favoriteTeamId}
          onChange={(event) => setFavoriteTeamId(event.target.value)}
          disabled={isPending}
        >
          <option value="">未設定</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </label>

      <div className="profile-favorite-actions">
        <button type="submit" className="home-btn home-btn-primary profile-favorite-submit" disabled={isPending}>
          {isPending ? "保存中..." : "保存する"}
        </button>
      </div>

      {message ? <p className="profile-favorite-message is-success">{message}</p> : null}
      {error ? <p className="profile-favorite-message is-error">{error}</p> : null}
    </form>
  );
}
