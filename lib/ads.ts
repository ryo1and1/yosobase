export type AdPlacement = "top" | "game" | "ranking";

const DEFAULT_ADSENSE_CLIENT_ID = "ca-pub-1679412386569499";

const ADSENSE_SLOT_ENV_BY_PLACEMENT: Record<AdPlacement, string> = {
  top: "NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_TOP",
  game: "NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_GAME",
  ranking: "NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_RANKING"
};

function readPublicEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function isAdSenseProductionEnabled(): boolean {
  return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production";
}

export function getAdSenseClientId(): string | null {
  const client = readPublicEnv("NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT") ?? DEFAULT_ADSENSE_CLIENT_ID;
  if (!client || !client.startsWith("ca-pub-")) {
    return null;
  }
  return client;
}

export function getAdSenseSlot(placement: AdPlacement): string | null {
  return readPublicEnv(ADSENSE_SLOT_ENV_BY_PLACEMENT[placement]);
}

export function getAdSenseUnitConfig(placement: AdPlacement): { client: string; slot: string } | null {
  if (!isAdSenseProductionEnabled()) {
    return null;
  }

  const client = getAdSenseClientId();
  const slot = getAdSenseSlot(placement);
  if (!client || !slot) {
    return null;
  }

  return { client, slot };
}
