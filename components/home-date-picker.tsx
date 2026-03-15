"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  value: string;
};

type DateInputWithShowPicker = HTMLInputElement & {
  showPicker?: () => void;
};

export function HomeDatePicker({ value }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<DateInputWithShowPicker | null>(null);
  const [draftValue, setDraftValue] = useState(value);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraftValue(value);
  }, [value]);

  function openPicker() {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextDate = event.currentTarget.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      return;
    }

    setDraftValue(nextDate);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("date", nextDate);

    startTransition(() => {
      router.push(`${pathname}?${nextParams.toString()}`);
    });
  }

  return (
    <div className="home-date-picker">
      <button
        type="button"
        className={`home-date-picker-trigger${isPending ? " is-pending" : ""}`}
        title="日付を選択"
        aria-label="日付を選択"
        onClick={openPicker}
        disabled={isPending}
      >
        <svg
          aria-hidden="true"
          className="home-date-picker-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
          <path d="M7.5 3.5v4" />
          <path d="M16.5 3.5v4" />
          <path d="M3.5 9.5h17" />
          <path d="M8 13h3" />
        </svg>
        <span>日付指定</span>
      </button>
      <input
        ref={inputRef}
        aria-hidden="true"
        tabIndex={-1}
        className="home-date-picker-input"
        type="date"
        value={draftValue}
        onChange={handleChange}
      />
    </div>
  );
}
