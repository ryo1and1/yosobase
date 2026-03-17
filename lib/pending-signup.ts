const PENDING_SIGNUP_EMAIL_KEY = "yosobase.pending-signup-email";

export function readPendingSignupEmail(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.sessionStorage.getItem(PENDING_SIGNUP_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writePendingSignupEmail(email: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, email);
  } catch {
    // Ignore storage failures. Signup itself should still work.
  }
}
