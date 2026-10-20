"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ResumeSummary } from "@/types/resume";
import { Button, Icon, Input } from "@/components/ui";
import { downloadFile, Menu } from "@/components/Menu";
import { cx } from "@/lib/cx";
import styles from "./ResumeActions.module.scss";

/** Edit / Download / More (Print, Duplicate, Rename, Delete) for one resume, like Zety's row actions. */
export function ResumeActions({ resume, onChanged, compact }: { resume: ResumeSummary; onChanged: () => void; compact?: boolean }) {
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
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
      <Menu
        items={[
          { label: "PDF", icon: "file", onSelect: () => downloadFile(api.pdfUrl(resume.id)) },
          { label: "Word (.docx)", icon: "file", onSelect: () => downloadFile(api.docxUrl(resume.id)) },
        ]}
        trigger={(props) => (
          <button type="button" className={styles.linkAction} {...props}>
            <Icon name="download" /> Download
          </button>
        )}
      />
      <Menu
        items={[
          { label: "Print", icon: "print", onSelect: () => window.open(api.printUrl(resume.id), "_blank") },
          { label: "Duplicate", icon: "copy", onSelect: () => run(() => api.duplicate(resume.id)) },
          { label: "Rename", icon: "edit", onSelect: () => setDialog("rename") },
          { label: "Delete", icon: "trash", danger: true, onSelect: () => setDialog("delete") },
        ]}
        trigger={(props) => (
          <Button size="sm" variant="ghost" disabled={busy} {...props}>
            <Icon name="more" /> More
          </Button>
        )}
      />

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
