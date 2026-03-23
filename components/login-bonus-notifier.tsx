"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { todayJst } from "@/lib/time";

const BONUS_MESSAGE_STORAGE_KEY = "yosobase-login-bonus-message";
const BONUS_NOTICE_DURATION_MS = 5_000;

type LoginBonusNotifierProps = {
  enabled: boolean;
  onApplied?: (pointBalance: number) => void;
};

type LoginBonusResponse = {
  applied: boolean;
  bonus_points: number;
  point_balance: number;
};

function readStoredMessage(): string | null {
  try {
    const message = window.sessionStorage.getItem(BONUS_MESSAGE_STORAGE_KEY);
    if (message) {
      window.sessionStorage.removeItem(BONUS_MESSAGE_STORAGE_KEY);
    }
    return message;
  } catch {
    return null;
  }
}

function storeMessage(message: string) {
  try {
    window.sessionStorage.setItem(BONUS_MESSAGE_STORAGE_KEY, message);
    window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(BONUS_MESSAGE_STORAGE_KEY);
      } catch {
        // Ignore storage errors while cleaning up the refresh fallback.
      }
    }, 1_500);
  } catch {
    // Ignore storage errors. The banner still renders in-memory for the current page.
  }
}

export function LoginBonusNotifier({ enabled, onApplied }: LoginBonusNotifierProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastCheckedRouteKeyRef = useRef<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [noticeSerial, setNoticeSerial] = useState(0);
  const [dayKey, setDayKey] = useState(() => todayJst());
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const storedMessage = readStoredMessage();
    if (storedMessage) {
      setMessage(storedMessage);
      setNoticeSerial((current) => current + 1);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      lastCheckedRouteKeyRef.current = null;
      return;
    }

    function syncDayKey() {
      setDayKey((current) => {
        const next = todayJst();
        return current === next ? current : next;
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        syncDayKey();
      }
    }

    syncDayKey();
    window.addEventListener("focus", syncDayKey);
    window.addEventListener("pageshow", syncDayKey);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", syncDayKey);
      window.removeEventListener("pageshow", syncDayKey);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, pathname, searchParams]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const routeKey = `${dayKey}:${pathname}?${searchParams.toString()}`;
    if (lastCheckedRouteKeyRef.current === routeKey) {
      return;
    }
    lastCheckedRouteKeyRef.current = routeKey;

    let isActive = true;

    async function checkLoginBonus() {
      try {
        const response = await fetch("/api/me/login-bonus/check", {
          method: "POST",
          cache: "no-store"
        });

        if (!response.ok) {
          return;
        }

        const result = (await response.json()) as LoginBonusResponse;
        if (!isActive || !result.applied) {
          return;
        }

        const nextMessage = `ログインボーナス +${result.bonus_points.toLocaleString()}pt を獲得しました`;
        storeMessage(nextMessage);
        setMessage(nextMessage);
        setNoticeSerial((current) => current + 1);
        onApplied?.(result.point_balance ?? 0);
        startTransition(() => {
          router.refresh();
        });
      } catch {
        // Silent failure is acceptable. Bonus checks happen again on later accesses.
      }
    }

    void checkLoginBonus();

    return () => {
      isActive = false;
    };
  }, [dayKey, enabled, onApplied, pathname, router, searchParams, startTransition]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, BONUS_NOTICE_DURATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message, noticeSerial]);

  if (!enabled || !message) {
    return null;
  }

  return (
    <div className="login-bonus-toast" role="status" aria-live="polite">
      <div className="login-bonus-toast-copy">
        <strong>デイリーボーナス</strong>
        <p>{message}</p>
      </div>
      <button type="button" className="login-bonus-toast-dismiss" onClick={() => setMessage(null)} aria-label="通知を閉じる">
        閉じる
      </button>
    </div>
  );
}
