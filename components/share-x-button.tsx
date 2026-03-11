"use client";

type Props = {
  text: string;
  eventName: string;
  className?: string;
};

export function ShareXButton({ text, eventName, className }: Props) {
  function openShare() {
    fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        metadata: { source: "share_button" }
      })
    }).catch(() => null);

    const url = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <button className={className ?? "btn btn-subtle"} onClick={openShare}>
      Xで共有
    </button>
  );
}
