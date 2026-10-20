"use client";

import { useEffect, useRef, useState } from "react";
import { ResumeRenderer } from "@/components/renderer/ResumeRenderer";
import { contentHeightPx, marginYPx } from "@/lib/paper";
import { useEditor, type Snapshot } from "@/store/editor";
import { IconButton, Toggle } from "@/components/ui";
import styles from "./Preview.module.scss";

const ZOOMS = [0.5, 0.65, 0.75, 0.9, 1, 1.25, 1.5];

/** Live WYSIWYG preview: the same renderer used for PDFs, with zoom and approximate page-break guides. */
export function Preview({ doc, onSectionClick }: { doc: Snapshot; onSectionClick: (id: string) => void }) {
  const activeSectionId = useEditor((s) => s.activeSectionId);
  const setActive = useEditor((s) => s.setActiveSection);
  const [zoom, setZoom] = useState(0.9);
  const [showBreaks, setShowBreaks] = useState(true);
  const [sheetHeight, setSheetHeight] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sheetRef.current?.querySelector<HTMLElement>("[data-resume-page]");
    if (!el) return;
    const ro = new ResizeObserver(() => setSheetHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const perPage = contentHeightPx(doc.style.paper);
  // The sheet's min-height is exactly one page, so allow a couple of px of rounding slack.
  const pages = Math.max(1, Math.ceil((sheetHeight - 2 * marginYPx - 2) / perPage));
  const zi = ZOOMS.indexOf(zoom);

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <div className={styles.zoom}>
          <IconButton icon="minus" label="Zoom out" disabled={zi <= 0} onClick={() => setZoom(ZOOMS[zi - 1])} />
          <span className={styles.zoomValue}>{Math.round(zoom * 100)}%</span>
          <IconButton icon="plus" label="Zoom in" disabled={zi >= ZOOMS.length - 1} onClick={() => setZoom(ZOOMS[zi + 1])} />
        </div>
        <div className={styles.options}>
          <span className={styles.pageCount}>
            {pages} page{pages > 1 ? "s" : ""}
          </span>
          <label className={styles.breakToggle}>
            <Toggle checked={showBreaks} onChange={setShowBreaks} label="Show page breaks" />
            Page breaks
          </label>
        </div>
      </div>

      <div className={styles.scroller} onClick={() => setActive(null)}>
        <div className={styles.zoomBox} style={{ zoom }}>
          <div ref={sheetRef} className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <ResumeRenderer resume={doc} onSectionClick={onSectionClick} activeSectionId={activeSectionId} />
            {showBreaks &&
              Array.from({ length: pages - 1 }, (_, k) => (
                <div
                  key={k}
                  className={styles.pageBreak}
                  style={{ top: marginYPx + (k + 1) * perPage }}
                >
                  <span className={styles.pageBreakLabel}>Page {k + 2}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
