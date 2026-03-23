"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { HeaderAccountMenu } from "@/components/header-account-menu";
import { LoginBonusNotifier } from "@/components/login-bonus-notifier";

type AuthMeResponse = {
  authenticated: boolean;
  user?: {
    display_name: string;
    point_balance: number;
  };
};

type HeaderSessionState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "authenticated"; pointBalance: number; avatarLabel: string };

function avatarLabelFromName(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return Array.from(trimmed)[0]?.toUpperCase() ?? "U";
}

export function HeaderSessionPanel() {
  const pathname = usePathname();
  const [state, setState] = useState<HeaderSessionState>({ status: "loading" });

  function handleLoginBonusApplied(pointBalance: number) {
    setState((current) => {
      if (current.status !== "authenticated") {
        return current;
      }

      return {
        ...current,
        pointBalance
      };
    });
  }

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "same-origin"
        });
        const payload = (await response.json().catch(() => null)) as AuthMeResponse | null;

        if (!isActive) {
          return;
        }

        if (!response.ok || !payload?.authenticated || !payload.user) {
          setState({ status: "guest" });
          return;
        }

        setState({
          status: "authenticated",
          pointBalance: payload.user.point_balance ?? 0,
          avatarLabel: avatarLabelFromName(payload.user.display_name)
        });
      } catch {
        if (isActive) {
          setState((current) => (current.status === "authenticated" ? current : { status: "guest" }));
        }
      }
    }

    void loadSession();

    return () => {
      isActive = false;
    };
  }, [pathname]);

  return (
    <>
      <Suspense fallback={null}>
        <LoginBonusNotifier enabled={state.status === "authenticated"} onApplied={handleLoginBonusApplied} />
      </Suspense>
      <div className="header-tools">
        {state.status === "authenticated" ? (
          <>
            <div className="header-points">
              <span>保有ポイント</span>
              <strong>{state.pointBalance.toLocaleString()} pt</strong>
            </div>
            <HeaderAccountMenu avatarLabel={state.avatarLabel} />
          </>
        ) : state.status === "guest" ? (
          <Link href="/login" className="header-auth-link">
            ログイン / 登録
          </Link>
        ) : (
          <div className="header-session-shell" aria-hidden="true">
            <div className="header-session-skeleton" />
            <div className="header-avatar header-avatar-placeholder" />
          </div>
        )}
      </div>
    </>
  );
}
