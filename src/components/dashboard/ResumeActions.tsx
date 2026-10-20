"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/api";
import type { ResumeSummary } from "@/types/resume";
import { Button, Icon, Input } from "@/components/ui";
import { cx } from "@/lib/cx";
import styles from "./ResumeActions.module.scss";

const MENU_WIDTH = 160; // matches .menu in the stylesheet (10rem)
const MENU_HEIGHT = 160; // roughly four items; used only to decide whether to open upward
const EDGE = 8;

type MenuPos = { left: number; top?: number; bottom?: number };

/** Edit / Download / More (Print, Duplicate, Rename, Delete) for one resume, like Zety's row actions. */
export function ResumeActions({ resume, onChanged, compact }: { resume: ResumeSummary; onChanged: () => void; compact?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The menu is rendered in a portal on <body>: inside a grid card it would be clipped by the card's
  // overflow:hidden. It is positioned from the More button, opening upward when there is no room below.
  const openMenu = () => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (!r) return;
    const left = Math.max(EDGE, Math.min(r.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - EDGE));
    const fitsBelow = r.bottom + 4 + MENU_HEIGHT <= window.innerHeight - EDGE;
    setMenuPos(fitsBelow ? { left, top: r.bottom + 4 } : { left, bottom: window.innerHeight - r.top + 4 });
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !menuRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    // A fixed-position menu would drift away from its button, so close it instead.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [menuOpen]);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setMenuOpen(false);
    try {
      await fn();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cx(styles.actions, !compact && styles.alignEnd)}>
      <Link href={`/resume/${resume.id}`} className={styles.linkAction}>
        <Icon name="edit" /> Edit
      </Link>
      <a href={api.pdfUrl(resume.id)} className={styles.linkAction}>
        <Icon name="download" /> Download
      </a>
      <div className={styles.moreWrap} ref={wrapRef}>
        <Button size="sm" variant="ghost" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())} disabled={busy}>
          <Icon name="more" /> More
        </Button>
        {menuOpen &&
          menuPos &&
          createPortal(
            <div ref={menuRef} role="menu" className={styles.menu} style={menuPos}>
              <button role="menuitem" className={styles.menuItem} onClick={() => (setMenuOpen(false), window.open(api.printUrl(resume.id), "_blank"))}>
                <Icon name="print" /> Print
              </button>
              <button role="menuitem" className={styles.menuItem} onClick={() => run(() => api.duplicate(resume.id))}>
                <Icon name="copy" /> Duplicate
              </button>
              <button role="menuitem" className={styles.menuItem} onClick={() => (setMenuOpen(false), setDialog("rename"))}>
                <Icon name="edit" /> Rename
              </button>
              <button role="menuitem" className={cx(styles.menuItem, styles.menuItemDanger)} onClick={() => (setMenuOpen(false), setDialog("delete"))}>
                <Icon name="trash" /> Delete
              </button>
            </div>,
          document.body,
        )}
      </div>

      {dialog === "rename" && (
        <RenameDialog
          name={resume.name}
          onCancel={() => setDialog(null)}
          onSave={(name) => {
            setDialog(null);
            run(() => api.update(resume.id, { name }));
          }}
        />
      )}
      {dialog === "delete" && (
        <Modal title="Delete resume?" onClose={() => setDialog(null)}>
          <p className={styles.dialogText}>
            “{resume.name}” will be permanently deleted. This can’t be undone.
          </p>
          <div className={styles.dialogActions}>
            <Button onClick={() => setDialog(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                setDialog(null);
                run(() => api.remove(resume.id));
              }}
            >
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RenameDialog({ name, onSave, onCancel }: { name: string; onSave: (n: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(name);
  return (
    <Modal title="Rename resume" onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSave(value.trim());
        }}
      >
        <Input aria-label="Resume name" autoFocus value={value} onChange={(e) => setValue(e.target.value)} onFocus={(e) => e.target.select()} />
        <div className={styles.dialogActions}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!value.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={styles.dialog} onMouseDown={(e) => e.stopPropagation()}>
        <h2 className={styles.dialogTitle}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
