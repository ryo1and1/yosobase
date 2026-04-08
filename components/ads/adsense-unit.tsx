"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSenseUnitProps = {
  client: string;
  slot: string;
  label?: string;
  minHeight?: number;
  className?: string;
};

export function AdSenseUnit({
  client,
  slot,
  label = "スポンサー",
  minHeight = 140,
  className = ""
}: AdSenseUnitProps) {
  const adRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    const element = adRef.current;
    if (!element || element.dataset.initialized === "true") {
      return;
    }

    let cancelled = false;
    let retryTimer: number | null = null;

    const initializeAd = () => {
      if (cancelled || element.dataset.initialized === "true") {
        return true;
      }

      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        element.dataset.initialized = "true";
        return true;
      } catch {
        return false;
      }
    };

    if (initializeAd()) {
      return;
    }

    let attempts = 0;
    retryTimer = window.setInterval(() => {
      attempts += 1;
      if (initializeAd() || attempts >= 20) {
        if (retryTimer !== null) {
          window.clearInterval(retryTimer);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      if (retryTimer !== null) {
        window.clearInterval(retryTimer);
      }
    };
  }, [client, slot]);

  return (
    <aside className={`ad-shell ${className}`.trim()} aria-label={label}>
      <p className="ad-shell-label">{label}</p>
      <div className="ad-shell-frame" style={{ minHeight }}>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={client}
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
