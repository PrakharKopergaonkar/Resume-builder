"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { clampLeftWidth, DEFAULT_LEFT_WIDTH, MAX_LEFT_WIDTH, MIN_LEFT_WIDTH } from "@/lib/panel-width";
import styles from "./ResizeHandle.module.scss";

type Area = { left: number; width: number };

/**
 * Vertical divider between the form panel and the preview. Drag it (or use the arrow keys) to
 * resize the form panel within the limits in `panel-width.ts`; double-click resets it.
 * `getArea` returns the box the two panels share (left edge of the form panel to the right edge of the row).
 */
export function ResizeHandle({
  value,
  onChange,
  onCommit,
  getArea,
}: {
  value: number;
  onChange: (width: number) => void;
  /** Called once a drag or key press finishes, so the caller can persist the width. */
  onCommit: (width: number) => void;
  getArea: () => Area;
}) {
  const [dragging, setDragging] = useState(false);
  const latest = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  // Keep the cursor and selection behavior consistent even when the pointer is over the preview.
  useEffect(() => {
    if (!dragging) return;
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [dragging]);

  useEffect(
    () => () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const apply = (width: number) => {
    latest.current = width;
    onChange(width);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    e.preventDefault();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const area = getArea();
    const next = clampLeftWidth(e.clientX - area.left, area.width);
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      apply(next);
    });
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    if (frame.current != null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    const area = getArea();
    const final = clampLeftWidth(e.clientX - area.left, area.width);
    apply(final);
    onCommit(final);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16;
    const area = getArea();
    let next: number;
    switch (e.key) {
      case "ArrowLeft":
        next = latest.current - step;
        break;
      case "ArrowRight":
        next = latest.current + step;
        break;
      case "Home":
        next = MIN_LEFT_WIDTH;
        break;
      case "End":
        next = MAX_LEFT_WIDTH;
        break;
      default:
        return;
    }
    e.preventDefault();
    next = clampLeftWidth(next, area.width);
    apply(next);
    onCommit(next);
  };

  const reset = () => {
    const next = clampLeftWidth(DEFAULT_LEFT_WIDTH, getArea().width);
    apply(next);
    onCommit(next);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panels"
      aria-valuenow={value}
      aria-valuemin={MIN_LEFT_WIDTH}
      aria-valuemax={MAX_LEFT_WIDTH}
      tabIndex={0}
      title="Drag to resize (double-click to reset)"
      data-dragging={dragging || undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      onDoubleClick={reset}
      className={cx(styles.handle, dragging && styles.dragging)}
    >
      {/* Wider invisible hit area so the 1px line is easy to grab. */}
      <div className={styles.hit} />
      <div className={styles.grip} />
    </div>
  );
}
