"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MAX_STAKE_PER_GAME, ODDS_MIN, optionsForMode } from "@/lib/game-rules";
import { optionLabel, winningOptionsFromResult } from "@/lib/odds";
import type {
  OddsItem,
  PredictionAllocation,
  PredictionMode,
  PredictionOption,
  Side
} from "@/lib/types";

type Props = {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  scoreHome: number | null;
  scoreAway: number | null;
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
type AllocationMap = Partial<Record<PredictionOption, number>>;

const QUICK_STAKE_AMOUNTS = [100, 300, 500] as const;

function modeLabel(mode: PredictionMode): string {
  return mode === "simple" ? "3択（ライト）" : "7択（詳細）";
}

function buildAllocationMap(rows: PredictionAllocation[]): AllocationMap {
  const next: AllocationMap = {};
  rows.forEach((row) => {
    next[row.option] = row.stake_points;
  });
  return next;
}

function sumAllocationMap(allocations: AllocationMap): number {
  return Object.values(allocations).reduce((sum, value) => sum + (value ?? 0), 0);
}

function sumAllocationMapForOptions(
  allocations: AllocationMap,
  options: readonly PredictionOption[]
): number {
  return options.reduce((sum, option) => sum + (allocations[option] ?? 0), 0);
}

export function PredictionPanel({
  gameId,
  homeTeamName,
  awayTeamName,
  scoreHome,
  scoreAway,
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
  const [savedMode, setSavedMode] = useState<PredictionMode>(initialMode);
  const [allocations, setAllocations] = useState<AllocationMap>(() => buildAllocationMap(initialAllocations));
  const [savedAllocations, setSavedAllocations] = useState<AllocationMap>(() => buildAllocationMap(initialAllocations));
  const [balance, setBalance] = useState(initialBalance);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<MessageType | null>(null);
  const [focused, setFocused] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const options = optionsForMode(mode);
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
    () => sumAllocationMapForOptions(allocations, options),
    [allocations, options]
  );
  const savedTotal = useMemo(() => sumAllocationMap(savedAllocations), [savedAllocations]);
  const displayedSettlementPoints = settlementPoints ?? 0;
  const isWinningPrediction = (settlementPoints ?? 0) > 0;
  const settlementPointText =
    displayedSettlementPoints > 0 ? `+${displayedSettlementPoints}` : `${displayedSettlementPoints}`;
  const winningOptions = useMemo(
    () => new Set(winningOptionsFromResult(winner, scoreHome, scoreAway)),
    [scoreAway, scoreHome, winner]
  );
  const hasVisibleDraftChanges = useMemo(() => {
    if (savedMode !== mode) {
      return true;
    }

    return options.some((option) => (allocations[option] ?? 0) !== (savedAllocations[option] ?? 0));
  }, [allocations, mode, options, savedAllocations, savedMode]);
  const maxAllocatableTotal = useMemo(
    () => Math.min(MAX_STAKE_PER_GAME, balance + savedTotal),
    [balance, savedTotal]
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

  function sanitizeStakeInput(value: string): number {
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length === 0) {
      return 0;
    }

    return Number.parseInt(digitsOnly, 10);
  }

  function normalizeStakeValue(current: AllocationMap, option: PredictionOption, value: number): number {
    const otherTotal = options.reduce((sum, currentOption) => {
      if (currentOption === option) {
        return sum;
      }
      return sum + (current[currentOption] ?? 0);
    }, 0);
    const maxForOption = Math.max(maxAllocatableTotal - otherTotal, 0);

    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    return Math.min(Math.floor(value), maxForOption);
  }

  function setStake(option: PredictionOption, value: number) {
    setAllocations((current) => {
      const nextValue = normalizeStakeValue(current, option, value);
      const next = { ...current };

      if (nextValue > 0) {
        next[option] = nextValue;
      } else {
        delete next[option];
      }

      return next;
    });
  }

  function addQuickStake(option: PredictionOption, amount: number | "all") {
    setAllocations((current) => {
      const rawValue = amount === "all" ? maxAllocatableTotal : (current[option] ?? 0) + amount;
      const nextValue = normalizeStakeValue(current, option, rawValue);
      const next = { ...current };

      if (nextValue > 0) {
        next[option] = nextValue;
      } else {
        delete next[option];
      }

      return next;
    });
  }

  function handleStakeKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    if (
      [
        "Backspace",
        "Delete",
        "Tab",
        "Enter",
        "Escape",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End"
      ].includes(event.key)
    ) {
      return;
    }

    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  async function submitPrediction() {
    if (totalStake <= 0) {
      setMessageType("error");
      setMessage("予想ポイントを入力してください。");
      return;
    }
    if (totalStake > maxAllocatableTotal) {
      setMessageType("error");
      setMessage(`この試合に配分できるのは最大 ${maxAllocatableTotal}pt です。`);
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
        throw new Error(json.error ?? "予想の保存に失敗しました。");
      }

      if (typeof json.point_balance === "number") {
        setBalance(json.point_balance);
      }

      const nextMode: PredictionMode = json.prediction?.mode === "detailed" ? "detailed" : "simple";
      const nextAllocations = Array.isArray(json.prediction?.allocations)
        ? buildAllocationMap(json.prediction.allocations as PredictionAllocation[])
        : buildAllocationMap(payloadAllocations);

      setMode(nextMode);
      setSavedMode(nextMode);
      setAllocations(nextAllocations);
      setSavedAllocations(nextAllocations);
      setMessageType("success");
      setMessage("予想を保存しました。");
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "予想の保存に失敗しました。";
      setMessageType("error");
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  async function clearPrediction() {
    if (savedTotal <= 0) {
      setAllocations({});
      setSavedAllocations({});
      setMessageType("success");
      setMessage("入力中の予想をクリアしました。");
      return;
    }

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
      setSavedAllocations({});
      setSavedMode(mode);
      if (typeof json.point_balance === "number") {
        setBalance(json.point_balance);
      } else if (typeof json.refunded === "number") {
        setBalance((current) => current + json.refunded);
      }
      setMessageType("success");
      setMessage("予想を取り消しました。");
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
          <h2>勝敗予想</h2>
          <p>初期ポイント 30,000pt / 1試合最大 {MAX_STAKE_PER_GAME}pt。開始5分前でオッズ固定・受付終了です。</p>
        </div>
        <p className={`prediction-deadline ${isClosed ? "is-closed" : ""}`}>
          {status === "scheduled" && !isClosed ? `締切まで ${Math.max(minutesLeft, 0)} 分` : "予想受付は終了しました。"}
        </p>
      </div>

      <div className="prediction-head" style={{ marginTop: "0.6rem" }}>
        <div>
          <p className="meta">予想モード: {modeLabel(mode)}</p>
          <p className="meta">保有ポイント: {balance.toLocaleString()}pt</p>
          {savedTotal > 0 && hasVisibleDraftChanges ? (
            <p className="meta">
              保存済み: {savedTotal.toLocaleString()}pt ({modeLabel(savedMode)})
              {savedMode === mode ? "。保存するとこの内容に更新されます。" : "。このモードで保存すると置き換わります。"}
            </p>
          ) : null}
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
          const odd = oddsMap.get(option) ?? ODDS_MIN;
          const maxForOption = normalizeStakeValue(allocations, option, maxAllocatableTotal);
          const isQuickDisabled = isClosed || loading || value >= maxForOption;
          const isHitOption =
            isWinningPrediction && (savedAllocations[option] ?? 0) > 0 && winningOptions.has(option);

          return (
            <div key={option} className={`prediction-option is-selected${isHitOption ? " is-hit" : ""}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.6rem", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <strong>{optionLabel(option)}</strong>
                  {isHitOption ? <span className="prediction-hit-badge">的中</span> : null}
                </div>
                <span className="prediction-option-side">オッズ {odd.toFixed(2)}x</span>
              </div>
              <input
                type="text"
                disabled={isClosed || loading}
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="done"
                pattern="[0-9]*"
                value={value > 0 ? String(value) : ""}
                onChange={(event) => setStake(option, sanitizeStakeInput(event.target.value))}
                onKeyDown={handleStakeKeyDown}
                placeholder="例: 100"
              />
              <div className="prediction-quick-actions">
                {QUICK_STAKE_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className="prediction-quick-button"
                    disabled={isQuickDisabled}
                    onClick={() => addQuickStake(option, amount)}
                  >
                    +{amount}
                  </button>
                ))}
                <button
                  type="button"
                  className="prediction-quick-button"
                  disabled={isQuickDisabled}
                  onClick={() => addQuickStake(option, "all")}
                >
                  ALL
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="prediction-current">
        {savedTotal > 0 && hasVisibleDraftChanges ? "編集中の配分" : "合計配分"}: {totalStake.toLocaleString()} /{" "}
        {maxAllocatableTotal.toLocaleString()} pt
      </p>

      {false ? (
        <p className={`prediction-settlement${isWinningPrediction ? " is-hit" : ""}`}>
          試合結果: {winner === "home" ? homeTeamName : winner === "away" ? awayTeamName : "引き分け / 勝敗なし"}
        </p>
      ) : null}

      <div className="prediction-actions">
        <button type="button" className="prediction-submit" disabled={isClosed || loading} onClick={submitPrediction}>
          予想を保存
        </button>
        <button type="button" className="prediction-clear" disabled={isClosed || loading} onClick={clearPrediction}>
          予想をクリア
        </button>
      </div>

      {status === "final" ? (
        <p className={`prediction-settlement${isWinningPrediction ? " is-hit" : ""}`}>精算ポイント: {settlementPointText} pt</p>
      ) : null}

      {message ? <p className={`prediction-message ${messageType === "error" ? "is-error" : "is-success"}`}>{message}</p> : null}
    </section>
  );
}
