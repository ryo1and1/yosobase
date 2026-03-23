"use client";

import { useEffect, useState } from "react";
import type { GameListItem } from "@/lib/types";

type GamesResponse = {
  games?: GameListItem[];
};

function mergePersonalization<T extends GameListItem>(baseGames: T[], personalizedGames: GameListItem[]): T[] {
  const personalizationMap = new Map(personalizedGames.map((game) => [game.id, game]));

  return baseGames.map((game) => {
    const personalized = personalizationMap.get(game.id);
    if (!personalized) {
      return game;
    }

    return {
      ...game,
      user_prediction: personalized.user_prediction,
      user_settlement_points: personalized.user_settlement_points,
      user_has_prediction: personalized.user_has_prediction
    };
  });
}

export function usePersonalizedGames<T extends GameListItem>({
  date,
  initialGames,
  enabled
}: {
  date: string;
  initialGames: T[];
  enabled: boolean;
}) {
  const [games, setGames] = useState<T[]>(initialGames);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setGames(initialGames);
  }, [initialGames]);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let isActive = true;
    setIsLoading(true);

    async function load() {
      try {
        const response = await fetch(`/api/games?date=${encodeURIComponent(date)}`, {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal
        });
        const payload = (await response.json().catch(() => null)) as GamesResponse | null;

        if (!response.ok || !payload?.games || !isActive) {
          return;
        }

        setGames(mergePersonalization(initialGames, payload.games) as T[]);
      } catch {
        if (controller.signal.aborted || !isActive) {
          return;
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [date, enabled, initialGames]);

  return { games, isLoading };
}
