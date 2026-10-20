"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useEditor, type SaveState } from "@/store/editor";
import { Button, Icon, IconButton } from "@/components/ui";

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
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3">
      <Link href="/" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100">
        <Icon name="arrowLeft" /> My Resumes
      </Link>
      <div className="h-6 w-px bg-neutral-200" />
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
        className="min-w-0 max-w-xs flex-1 rounded px-2 py-1 font-semibold text-neutral-900 hover:bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
      />
      <span
        role="status"
        className={`flex items-center gap-1 text-xs ${saveState === "error" ? "text-red-600" : "text-neutral-500"}`}
        data-save-state={saveState}
      >
        {saveState === "saved" && <Icon name="check" className="h-3.5 w-3.5" />}
        {saveState === "error" && <Icon name="alert" className="h-3.5 w-3.5" />}
        {SAVE_LABEL[saveState]}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <IconButton icon="undo" label="Undo (⌘Z)" disabled={!canUndo} onClick={undo} />
        <IconButton icon="redo" label="Redo (⇧⌘Z)" disabled={!canRedo} onClick={redo} />
        <div className="mx-1 h-6 w-px bg-neutral-200" />
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
