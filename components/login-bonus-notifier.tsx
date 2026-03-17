"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const BONUS_MESSAGE_STORAGE_KEY = "yosobase-login-bonus-message";
const BONUS_NOTICE_DURATION_MS = 5_000;

type LoginBonusNotifierProps = {
  enabled: boolean;
};

type LoginBonusResponse = {
  applied: boolean;
  bonus_points: number;
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

export function LoginBonusNotifier({ enabled }: LoginBonusNotifierProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastCheckedRouteKeyRef = useRef<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [noticeSerial, setNoticeSerial] = useState(0);
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
      return;
    }

    const routeKey = `${pathname}?${searchParams.toString()}`;
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
  }, [enabled, pathname, router, searchParams, startTransition]);

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
