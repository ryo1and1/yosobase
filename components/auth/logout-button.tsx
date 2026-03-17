"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type LogoutButtonProps = {
  className?: string;
  redirectTo?: string;
};

export function LogoutButton({ className = "auth-secondary-btn", redirectTo = "/login" }: LogoutButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("logout_failed");
      }

      router.replace(redirectTo);
      router.refresh();
    } catch {
      setIsSubmitting(false);
      window.alert("ログアウトに失敗しました。時間をおいて再度お試しください。");
    }
  }

  return (
    <button type="button" className={className} onClick={handleLogout} disabled={isSubmitting}>
      {isSubmitting ? "ログアウト中..." : "ログアウト"}
    </button>
  );
}
