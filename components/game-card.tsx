import Link from "next/link";
import { formatJstTime } from "@/lib/time";
import { sideLabel, statusLabel } from "@/lib/ui";
import type { Side } from "@/lib/types";

type Props = {
  game: {
    id: string;
    start_at: string;
    stadium: string | null;
    status: "scheduled" | "in_progress" | "final" | "canceled";
    winner: Side | null;
    home_team: { id: string; name: string };
    away_team: { id: string; name: string };
    user_prediction: Side | null;
  };
  isAuthenticated: boolean;
};

export function GameCard({ game, isAuthenticated }: Props) {
  const now = Date.now();
  const started = now >= new Date(game.start_at).getTime();
  const canPredict = !started && game.status === "scheduled";

  let ctaLabel = "結果を見る";
  if (canPredict) {
    ctaLabel = "予想する";
  } else if (game.status !== "final") {
    ctaLabel = "締切済み";
  }

  const predictionTarget = `/games/${game.id}#prediction`;
  const loginTarget = `/login?returnTo=${encodeURIComponent(predictionTarget)}`;
  const href = canPredict && !isAuthenticated ? loginTarget : predictionTarget;

  return (
    <article className="panel">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "center" }}>
        <div className="meta">
          {formatJstTime(game.start_at)}
          {game.stadium ? ` / ${game.stadium}` : ""}
        </div>
        <span className={`status-badge status-${game.status}`}>{statusLabel(game.status)}</span>
      </div>
      <p className="team-vs">
        {game.home_team.name} 対 {game.away_team.name}
      </p>
      <p className="meta">
        {game.user_prediction
          ? `予想済み（${sideLabel(game.user_prediction, game.home_team.name, game.away_team.name)}）`
          : "未予想"}
      </p>
      <div className="actions">
        <Link className={`btn ${canPredict || game.status === "final" ? "btn-primary" : "btn-subtle btn-disabled"}`} href={href}>
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}
