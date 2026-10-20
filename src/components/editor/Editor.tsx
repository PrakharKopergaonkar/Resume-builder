"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useEditor } from "@/store/editor";
import { useAutosave } from "@/store/useAutosave";
import { Icon, type IconName } from "@/components/ui";
import { AddSectionPanel } from "./AddSectionPanel";
import { ContentPanel } from "./ContentPanel";
import { DesignPanel } from "./DesignPanel";
import { Preview } from "./Preview";
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
  const [tab, setTab] = useState<Tab>("content");
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
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-neutral-600">
        <p>This resume doesn’t exist or was deleted.</p>
        <Link href="/" className="text-blue-700 underline">
          Back to My Resumes
        </Link>
      </div>
    );
  if (!doc) return <div className="flex h-screen items-center justify-center text-sm text-neutral-500">Loading editor…</div>;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Toolbar />
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-20 shrink-0 flex-col items-center gap-1 border-r border-neutral-200 bg-white py-3" aria-label="Editor tools">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`flex w-16 flex-col items-center gap-1 rounded-lg py-2 text-[11px] font-medium ${tab === t.id ? "bg-blue-50 text-blue-800" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              <Icon name={t.icon} className="h-5 w-5" />
              {t.label}
            </button>
          ))}
        </nav>
        <aside className="w-[440px] shrink-0 overflow-y-auto border-r border-neutral-200 bg-neutral-50">
          <h2 className="px-4 pt-4 text-lg font-semibold text-neutral-900">{TABS.find((t) => t.id === tab)!.label}</h2>
          {tab === "content" && <ContentPanel content={doc.content} />}
          {tab === "design" && <DesignPanel doc={doc} />}
          {tab === "add" && <AddSectionPanel doc={doc} onAdded={() => setTab("content")} />}
        </aside>
        <main className="min-w-0 flex-1">
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
    </div>
  );
}
