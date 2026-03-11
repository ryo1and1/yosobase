"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type HeaderAccountMenuProps = {
  avatarLabel: string;
};

export function HeaderAccountMenu({ avatarLabel }: HeaderAccountMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function closeMenu() {
    menuRef.current?.removeAttribute("open");
    const summary = menuRef.current?.querySelector("summary");
    if (summary instanceof HTMLElement) {
      summary.blur();
    }
  }

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current) {
        return;
      }
      if (menuRef.current.contains(event.target as Node)) {
        return;
      }
      closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      closeMenu();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogout() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    closeMenu();

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("logout failed");
      }
      window.location.assign("/");
    } catch (error) {
      console.error("logout error", error);
      setIsSubmitting(false);
      window.alert("ログアウトに失敗しました。時間をおいて再度お試しください。");
    }
  }

  return (
    <details className="header-account-menu" ref={menuRef}>
      <summary className="header-avatar header-avatar-button" aria-label="アカウントメニュー">
        {avatarLabel}
      </summary>
      <div className="header-menu-popover">
        <Link href="/me" className="header-menu-item" onClick={closeMenu}>成績</Link>
        <button type="button" className="header-menu-item is-danger" onClick={handleLogout} disabled={isSubmitting}>
          {isSubmitting ? "ログアウト中..." : "ログアウト"}
        </button>
      </div>
    </details>
  );
}

