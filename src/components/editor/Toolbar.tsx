"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useEditor, type SaveState } from "@/store/editor";
import { Button, Icon, IconButton } from "@/components/ui";
import { cx } from "@/lib/cx";
import { ThemeToggle } from "@/components/ThemeToggle";
import styles from "./Toolbar.module.scss";

const SAVE_LABEL: Record<SaveState, string> = { saved: "Saved", unsaved: "Unsaved changes", saving: "Saving…", error: "Save failed" };

export function Toolbar() {
  const id = useEditor((s) => s.id)!;
  const name = useEditor((s) => s.doc?.name ?? "");
  const saveState = useEditor((s) => s.saveState);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const { undo, redo, edit } = useEditor.getState();
  const [draftName, setDraftName] = useState<string | null>(null);

  const commitName = () => {
    const next = draftName?.trim();
    if (next && next !== name) edit((d) => void (d.name = next));
    setDraftName(null);
  };

  return (
    <header className={styles.toolbar}>
      <Link href="/" className={styles.back}>
        <Icon name="arrowLeft" /> My Resumes
      </Link>
      <div className={styles.divider} />
      <input
        aria-label="Resume name"
        value={draftName ?? name}
        onChange={(e) => setDraftName(e.target.value)}
        onBlur={commitName}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraftName(null);
            e.currentTarget.blur();
          }
        }}
        className={styles.nameInput}
      />
      <span
        role="status"
        className={cx(styles.status, saveState === "error" && styles.statusError)}
        data-save-state={saveState}
      >
        {saveState === "saved" && <Icon name="check" size="xs" />}
        {saveState === "error" && <Icon name="alert" size="xs" />}
        {SAVE_LABEL[saveState]}
      </span>

      <div className={styles.rail}>
        <IconButton icon="undo" label="Undo (⌘Z)" disabled={!canUndo} onClick={undo} />
        <IconButton icon="redo" label="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo} />
        <div className={cx(styles.divider, styles.dividerInset)} />
        <ThemeToggle />
        <Button variant="secondary" onClick={() => window.open(api.printUrl(id), "_blank")}>
          <Icon name="print" /> Print
        </Button>
        <DownloadButton id={id} saveState={saveState} />
      </div>
    </header>
  );
}

/** Waits for pending autosaves so the PDF always reflects what's on screen. */
export function DownloadButton({ id, saveState }: { id: string; saveState: SaveState }) {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      await waitForSaved();
      const a = document.createElement("a");
      a.href = api.pdfUrl(id);
      a.click();
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  };
  return (
    <Button variant="primary" onClick={download} disabled={busy || saveState === "error"}>
      <Icon name="download" /> {busy ? "Preparing…" : "Download PDF"}
    </Button>
  );
}

function waitForSaved(timeoutMs = 10_000): Promise<void> {
  return new Promise((resolve) => {
    if (useEditor.getState().saveState === "saved") return resolve();
    const stop = setTimeout(() => {
      unsub();
      resolve();
    }, timeoutMs);
    const unsub = useEditor.subscribe((s) => {
      if (s.saveState === "saved") {
        clearTimeout(stop);
        unsub();
        resolve();
      }
    });
  });
}
