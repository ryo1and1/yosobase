"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MAX_STAKE_PER_GAME, SIMPLE_OPTIONS, DETAILED_OPTIONS } from "@/lib/game-rules";
import { optionLabel } from "@/lib/odds";
import type { OddsItem, PredictionAllocation, PredictionMode, Side } from "@/lib/types";

type Props = {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  startAt: string;
  status: "scheduled" | "in_progress" | "final" | "canceled";
  winner: Side | null;
  mode: PredictionMode;
  odds: OddsItem[];
  initialAllocations: PredictionAllocation[];
  pointBalance: number;
  settlementPoints: number | null;
};

type MessageType = "success" | "error";

function modeLabel(mode: PredictionMode): string {
  return mode === "simple" ? "3択（ライト）" : "7択（詳細）";
}

export function PredictionPanel({
  gameId,
  homeTeamName,
  awayTeamName,
  startAt,
  status,
  winner,
  mode: initialMode,
  odds: initialOdds,
  initialAllocations,
  pointBalance: initialBalance,
  settlementPoints
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<PredictionMode>(initialMode);
  const [allocations, setAllocations] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    initialAllocations.forEach((row) => {
      next[row.option] = row.stake_points;
    });
    return next;
  });
  const [balance, setBalance] = useState(initialBalance);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType | null>(null);
  const [focused, setFocused] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const options = mode === "simple" ? SIMPLE_OPTIONS : DETAILED_OPTIONS;
  const oddsMap = useMemo(() => {
    const map = new Map<string, number>();
    initialOdds.forEach((row) => map.set(row.option, row.odds));
    return map;
  }, [initialOdds]);

  const deadlineMs = useMemo(() => new Date(startAt).getTime() - 5 * 60 * 1000, [startAt]);
  const isClosed = useMemo(() => {
    if (status !== "scheduled") {
      return true;
    }
    return nowMs >= deadlineMs;
  }, [deadlineMs, nowMs, status]);
  const minutesLeft = useMemo(() => Math.floor((deadlineMs - nowMs) / 60000), [deadlineMs, nowMs]);

  const totalStake = useMemo(
    () =>
      options.reduce((sum, option) => {
        return sum + (allocations[option] ?? 0);
      }, 0),
    [allocations, options]
  );

  useEffect(() => {
    if (searchParams.get("focus") !== "prediction") {
      return;
    }

    const panel = document.getElementById("prediction-panel");
    if (!panel) {
      return;
    }

    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    setFocused(true);
    const timer = window.setTimeout(() => setFocused(false), 1800);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  useEffect(() => {
    setNowMs(Date.now());
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function setStake(option: string, value: number) {
    setAllocations((current) => ({
      ...current,
      [option]: Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
    }));
  }

  async function submitPrediction() {
    if (totalStake <= 0) {
      setMessageType("error");
      setMessage("配分ポイントを入力してください。");
      return;
    }
    if (totalStake > MAX_STAKE_PER_GAME) {
      setMessageType("error");
      setMessage(`1試合の合計は ${MAX_STAKE_PER_GAME}pt までです。`);
      return;
    }

    const payloadAllocations = options
      .map((option) => ({
        option,
        stake_points: allocations[option] ?? 0
      }))
      .filter((row) => row.stake_points > 0);

    setLoading(true);
    setMessage(null);
    setMessageType(null);

    try {
      const response = await fetch(`/api/games/${gameId}/prediction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, allocations: payloadAllocations })
      });

      const json = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/login?returnTo=${encodeURIComponent(`/games/${gameId}`)}&focus=prediction`);
          return;
        }
        throw new Error(json.error ?? "予想の登録に失敗しました。");
      }

      if (typeof json.point_balance === "number") {
        setBalance(json.point_balance);
      }
      setMessageType("success");
      setMessage("予想配分を保存しました。");
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "予想の登録に失敗しました。";
      setMessageType("error");
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  async function clearPrediction() {
    setLoading(true);
    setMessage(null);
    setMessageType(null);

    try {
      const response = await fetch(`/api/games/${gameId}/prediction`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          router.push(`/login?returnTo=${encodeURIComponent(`/games/${gameId}`)}&focus=prediction`);
          return;
        }
        throw new Error(json.error ?? "予想の取り消しに失敗しました。");
      }

      setAllocations({});
      if (typeof json.refunded === "number") {
        setBalance((current) => current + json.refunded);
      }
      setMessageType("success");
      setMessage("予想配分を取り消しました。");
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "予想の取り消しに失敗しました。";
      setMessageType("error");
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="prediction-panel" className={`prediction-card${focused ? " is-focus" : ""}`}>
      <div className="prediction-head">
        <div>
          <h2>予想配分</h2>
          <p>
            初期ポイント 30,000pt / 1試合最大 {MAX_STAKE_PER_GAME}pt。開始5分前でオッズ固定・受付終了です。
          </p>
        </div>
        <p className={`prediction-deadline ${isClosed ? "is-closed" : ""}`}>
          {status === "scheduled" && !isClosed ? `締切まで ${Math.max(minutesLeft, 0)} 分` : "予想受付は終了しました"}
        </p>
      </div>

      <div className="prediction-head" style={{ marginTop: "0.6rem" }}>
        <div>
          <p className="meta">現在モード: {modeLabel(mode)}</p>
          <p className="meta">保有ポイント: {balance.toLocaleString()}pt</p>
        </div>
        <div className="actions">
          <button
            type="button"
            className="prediction-clear"
            disabled={isClosed || loading}
            onClick={() => setMode("simple")}
          >
            3択
          </button>
          <button
            type="button"
            className="prediction-clear"
            disabled={isClosed || loading}
            onClick={() => setMode("detailed")}
          >
            7択
          </button>
        </div>
      </div>

      <div className="prediction-options" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.6rem" }}>
        {options.map((option) => {
          const value = allocations[option] ?? 0;
          const odd = oddsMap.get(option) ?? 1.3;
          return (
            <div key={option} className="prediction-option is-selected">
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "center" }}>
                <strong>{optionLabel(option)}</strong>
                <span className="prediction-option-side">オッズ {odd.toFixed(2)}x</span>
              </div>
              <input
                type="number"
                min={0}
                step={10}
                disabled={isClosed || loading}
                value={value}
                onChange={(event) => setStake(option, Number.parseInt(event.target.value || "0", 10))}
                placeholder="0"
              />
            </div>
          );
        })}
      </div>

      <p className="prediction-current">合計配分: {totalStake} / {MAX_STAKE_PER_GAME} pt</p>

      {status === "final" ? (
        <p className="prediction-settlement">
          試合結果: {winner === "home" ? homeTeamName : winner === "away" ? awayTeamName : "引き分け/勝敗なし"}
        </p>
      ) : null}

      <div className="prediction-actions">
        <button className="prediction-submit" disabled={isClosed || loading} onClick={submitPrediction}>
          配分を保存
        </button>
        <button className="prediction-clear" disabled={isClosed || loading} onClick={clearPrediction}>
          配分を取り消す
        </button>
      </div>

      {status === "final" ? (
        <p className="prediction-settlement">精算ポイント: {settlementPoints ?? 0} pt</p>
      ) : null}

      {message ? <p className={`prediction-message ${messageType === "error" ? "is-error" : "is-success"}`}>{message}</p> : null}
    </section>
  );
}
