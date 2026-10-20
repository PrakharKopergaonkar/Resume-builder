"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ResumeSummary } from "@/types/resume";
import { Button, Icon, Input } from "@/components/ui";

/** Edit / Download / More (Print, Duplicate, Rename, Delete) for one resume, like Zety's row actions. */
export function ResumeActions({ resume, onChanged, compact }: { resume: ResumeSummary; onChanged: () => void; compact?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
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

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-100";

  return (
    <div className={`flex flex-wrap items-center gap-1 ${compact ? "" : "justify-end"}`}>
      <Link href={`/resume/${resume.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50">
        <Icon name="edit" /> Edit
      </Link>
      <a href={api.pdfUrl(resume.id)} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-blue-700 hover:bg-blue-50">
        <Icon name="download" /> Download
      </a>
      <div className="relative" ref={menuRef}>
        <Button size="sm" variant="ghost" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)} disabled={busy}>
          <Icon name="more" /> More
        </Button>
        {menuOpen && (
          <div role="menu" className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
            <button role="menuitem" className={item} onClick={() => (setMenuOpen(false), window.open(api.printUrl(resume.id), "_blank"))}>
              <Icon name="print" /> Print
            </button>
            <button role="menuitem" className={item} onClick={() => run(() => api.duplicate(resume.id))}>
              <Icon name="copy" /> Duplicate
            </button>
            <button role="menuitem" className={item} onClick={() => (setMenuOpen(false), setDialog("rename"))}>
              <Icon name="edit" /> Rename
            </button>
            <button role="menuitem" className={`${item} text-red-600`} onClick={() => (setMenuOpen(false), setDialog("delete"))}>
              <Icon name="trash" /> Delete
            </button>
          </div>
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
          <p className="text-sm text-neutral-600">
            “{resume.name}” will be permanently deleted. This can’t be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
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
        <div className="mt-5 flex justify-end gap-2">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-sm rounded-xl bg-white p-5 text-left shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
