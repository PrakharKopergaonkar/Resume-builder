"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { clampLeftWidth, DEFAULT_LEFT_WIDTH, readStoredLeftWidth, storeLeftWidth } from "@/lib/panel-width";
import { useEditor, type Snapshot } from "@/store/editor";
import { useAutosave } from "@/store/useAutosave";
import { Icon, type IconName } from "@/components/ui";
import { cx } from "@/lib/cx";
import { AddSectionPanel } from "./AddSectionPanel";
import { ContentPanel } from "./ContentPanel";
import { DesignPanel } from "./DesignPanel";
import styles from "./Editor.module.scss";
import { Preview } from "./Preview";
import { ResizeHandle } from "./ResizeHandle";
import { Toolbar } from "./Toolbar";

type Tab = "content" | "design" | "add";
const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: "content", label: "Content", icon: "edit" },
  { id: "design", label: "Design", icon: "palette" },
  { id: "add", label: "Add section", icon: "plus" },
];

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

export function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const doc = useEditor((s) => (s.id === id ? s.doc : null));
  const [error, setError] = useState(false);

  useAutosave();

  useEffect(() => {
    api.get(id).then(useEditor.getState().load, () => setError(true));
  }, [id]);

  // Document-level undo/redo; text fields keep their own native undo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z" || isTyping(e.target)) return;
      e.preventDefault();
      const { undo, redo } = useEditor.getState();
      if (e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error)
    return (
      <div className={cx(styles.fullScreen, styles.notFound)}>
        <p>This resume doesn’t exist or was deleted.</p>
        <Link href="/" className={styles.notFoundLink}>
          Back to My Resumes
        </Link>
      </div>
    );
  if (!doc) return <div className={cx(styles.fullScreen, styles.loading)}>Loading editor…</div>;

  return (
    <div className={styles.editor}>
      <Toolbar />
      <Workspace doc={doc} />
    </div>
  );
}

/**
 * Icon rail + form panel + preview. Rendered only once the resume has loaded (client side), so the
 * saved panel width can be read from localStorage without a hydration mismatch.
 */
function Workspace({ doc }: { doc: Snapshot }) {
  const [tab, setTab] = useState<Tab>("content");
  const rowRef = useRef<HTMLDivElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const [leftWidth, setLeftWidth] = useState(() =>
    clampLeftWidth(readStoredLeftWidth() ?? DEFAULT_LEFT_WIDTH, window.innerWidth - 80),
  );

  /** Space shared by the form panel and the preview: from the form panel's left edge to the row's right edge. */
  const getArea = () => {
    const left = asideRef.current?.getBoundingClientRect().left ?? 0;
    const right = rowRef.current?.getBoundingClientRect().right ?? window.innerWidth;
    return { left, width: right - left };
  };

  // Shrinking the window must never squeeze the preview below its minimum.
  useEffect(() => {
    const onResize = () => setLeftWidth((w) => clampLeftWidth(w, getArea().width));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div ref={rowRef} className={styles.workspace}>
      <nav className={styles.rail} aria-label="Editor tools">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={cx(styles.tab, tab === t.id && styles.tabActive)}
          >
            <Icon name={t.icon} size="md" />
            {t.label}
          </button>
        ))}
      </nav>
      <aside ref={asideRef} style={{ width: leftWidth }} className={styles.panel} data-testid="form-panel">
        <h2 className={styles.panelTitle}>{TABS.find((t) => t.id === tab)!.label}</h2>
        {tab === "content" && <ContentPanel content={doc.content} />}
        {tab === "design" && <DesignPanel doc={doc} />}
        {tab === "add" && <AddSectionPanel doc={doc} onAdded={() => setTab("content")} />}
      </aside>
      <ResizeHandle value={leftWidth} onChange={setLeftWidth} onCommit={storeLeftWidth} getArea={getArea} />
      <main className={styles.preview}>
        <Preview
          doc={doc}
          onSectionClick={(sectionId) => {
            // Clicking a section in the preview jumps to its form.
            useEditor.getState().setActiveSection(sectionId);
            setTab("content");
          }}
        />
      </main>
    </div>
  );
}
