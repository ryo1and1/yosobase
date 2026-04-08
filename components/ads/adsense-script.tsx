import Script from "next/script";
import { getAdSenseClientId, isAdSenseProductionEnabled } from "@/lib/ads";

export function AdSenseScript() {
  if (!isAdSenseProductionEnabled()) {
    return null;
  }

  const client = getAdSenseClientId();
  if (!client) {
    return null;
  }

  return (
    <Script
      id="adsense-script"
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}
