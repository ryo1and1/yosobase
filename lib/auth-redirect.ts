export function sanitizeReturnTo(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return null;
  }
  return trimmed;
}

export function sanitizeFocus(value: string | null | undefined): string | null {
  return value === "prediction" ? value : null;
}

export function buildQuerySuffix(returnTo: string | null, focus: string | null): string {
  const params = new URLSearchParams();

  if (returnTo) {
    params.set("returnTo", returnTo);
  }
  if (focus) {
    params.set("focus", focus);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function buildAuthConfirmPath(returnTo: string | null, focus: string | null): string {
  const params = new URLSearchParams();

  if (returnTo) {
    params.set("next", returnTo);
  }
  if (focus) {
    params.set("focus", focus);
  }

  const query = params.toString();
  return query ? `/auth/confirm?${query}` : "/auth/confirm";
}

export function buildPostAuthPath(returnTo: string | null, focus: string | null): string {
  if (!returnTo) {
    return "/mypage";
  }

  const url = new URL(returnTo, "http://localhost");
  if (focus && !url.searchParams.has("focus")) {
    url.searchParams.set("focus", focus);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
