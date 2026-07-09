import { AdSenseUnit } from "@/components/ads/adsense-unit";
import { getAdSenseUnitConfig } from "@/lib/ads";

type EditorialAdProps = {
  className?: string;
};

export function EditorialAd({ className = "" }: EditorialAdProps) {
  const ad = getAdSenseUnitConfig("top");

  if (!ad) {
    return null;
  }

  return <AdSenseUnit client={ad.client} slot={ad.slot} className={className} />;
}
