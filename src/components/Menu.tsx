"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./ui";
import styles from "./Menu.module.scss";

export type MenuItem = { label: string; icon?: IconName; onSelect: () => void; danger?: boolean };

/** Props to spread on the element that opens the menu. */
export type MenuTriggerProps = {
  "aria-haspopup": "menu";
  "aria-expanded": boolean;
  onClick: (e: React.MouseEvent<HTMLElement>) => void;
};

const WIDTH = 160; // matches .menu (10rem)
const ITEM_HEIGHT = 36;
const EDGE = 8;

type Pos = { left: number; top?: number; bottom?: number };

/** Below the button, right-aligned to it; above it when there isn't room below. */
function place(r: DOMRect, itemCount: number): Pos {
  const height = itemCount * ITEM_HEIGHT + 8;
  const left = Math.max(EDGE, Math.min(r.right - WIDTH, window.innerWidth - WIDTH - EDGE));
  const fitsBelow = r.bottom + 4 + height <= window.innerHeight - EDGE;
  return fitsBelow ? { left, top: r.bottom + 4 } : { left, bottom: window.innerHeight - r.top + 4 };
}

/**
 * Dropdown menu. The list is rendered in a portal on <body> so containers with overflow:hidden (dashboard grid
 * cards) can't clip it. It is positioned from its button, opens upward when there's no room below, and follows the
 * button when the page scrolls or resizes. It closes on Escape, outside click, or when the button leaves the screen;
 * arrow keys move between items.
 */
export function Menu({ items, trigger }: { items: MenuItem[]; trigger: (props: MenuTriggerProps) => React.ReactNode }) {
  const itemCount = items.length;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null); // the button that opened the menu

  // Positioned from the clicked button itself (the event gives us its rectangle).
  const toggle = (e: React.MouseEvent<HTMLElement>) => {
    if (open) return setOpen(false);
    setAnchor(e.currentTarget);
    setPos(place(e.currentTarget.getBoundingClientRect(), items.length));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus({ preventScroll: true });
    const close = () => setOpen(false);
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !menuRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const buttons = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [])];
      if (!buttons.length) return;
      e.preventDefault();
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
      buttons[(i + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length].focus();
    };
    // Keep the (fixed-position) menu attached to its button when the page scrolls or resizes — including the small
    // automatic scroll adjustments browsers make when lazy images above load. Close once the button leaves the screen.
    const follow = () => {
      const r = anchor?.getBoundingClientRect();
      if (!anchor?.isConnected || !r || r.bottom < 0 || r.top > window.innerHeight) return close();
      setPos(place(r, itemCount));
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open, itemCount, anchor]);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {trigger({ "aria-haspopup": "menu", "aria-expanded": open, onClick: toggle })}
      {open &&
        pos &&
        createPortal(
          <div ref={menuRef} role="menu" className={styles.menu} style={pos}>
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={cx(styles.item, item.danger && styles.danger)}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.icon && <Icon name={item.icon} />} {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

/** Starts a file download without leaving the page (the endpoint answers with Content-Disposition: attachment). */
export function downloadFile(url: string) {
  const a = document.createElement("a");
  a.href = url;
  a.click();
}
