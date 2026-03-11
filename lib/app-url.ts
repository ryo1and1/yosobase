const LOCAL_DEV_URL = "http://localhost:3000";

function normalizeUrl(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }

  return `https://${normalized}`;
}

export function getAppBaseUrl(): string {
  const isPreview = process.env.VERCEL_ENV === "preview";

  if (isPreview) {
    return (
      normalizeUrl(process.env.VERCEL_BRANCH_URL) ??
      normalizeUrl(process.env.VERCEL_URL) ??
      normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ??
      LOCAL_DEV_URL
    );
  }

  return (
    normalizeUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
    normalizeUrl(process.env.VERCEL_URL) ??
    LOCAL_DEV_URL
  );
}
