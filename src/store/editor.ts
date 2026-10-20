import { create } from "zustand";
import type { ResumeDoc } from "@/types/resume";

/** The editable part of a resume; this is what undo/redo and autosave operate on. */
export type Snapshot = Pick<ResumeDoc, "name" | "templateId" | "style" | "content">;

export type SaveState = "saved" | "unsaved" | "saving" | "error";

const HISTORY_LIMIT = 100;
/** Consecutive edits with the same key inside this window become one undo step (typing). */
const COALESCE_MS = 1000;

type EditorState = {
  id: string | null;
  doc: Snapshot | null;
  past: Snapshot[];
  future: Snapshot[];
  lastEdit: { key: string; at: number } | null;
  /** Bumped on every change; autosave compares it to know whether a save is stale. */
  version: number;
  saveState: SaveState;
  activeSectionId: string | null;

  load: (doc: ResumeDoc) => void;
  /** Applies a mutation to a deep copy of the document. `key` groups rapid edits into one undo step. */
  edit: (recipe: (draft: Snapshot) => void, key?: string) => void;
  undo: () => void;
  redo: () => void;
  setSaveState: (s: SaveState) => void;
  setActiveSection: (id: string | null) => void;
};

export const toSnapshot = (d: ResumeDoc): Snapshot => ({
  name: d.name,
  templateId: d.templateId,
  style: d.style,
  content: d.content,
});

export const useEditor = create<EditorState>()((set, get) => ({
  id: null,
  doc: null,
  past: [],
  future: [],
  lastEdit: null,
  version: 0,
  saveState: "saved",
  activeSectionId: null,

  load: (doc) =>
    set({
      id: doc.id,
      doc: toSnapshot(doc),
      past: [],
      future: [],
      lastEdit: null,
      version: 0,
      saveState: "saved",
      activeSectionId: null,
    }),

  edit: (recipe, key) => {
    const { doc, past, lastEdit, version } = get();
    if (!doc) return;
    const next = structuredClone(doc);
    recipe(next);
    const now = Date.now();
    const coalesce = key != null && lastEdit?.key === key && now - lastEdit.at < COALESCE_MS;
    set({
      doc: next,
      past: coalesce ? past : [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      lastEdit: key != null ? { key, at: now } : null,
      version: version + 1,
      saveState: "unsaved",
    });
  },

  undo: () => {
    const { doc, past, future, version } = get();
    if (!doc || past.length === 0) return;
    set({
      doc: past[past.length - 1],
      past: past.slice(0, -1),
      future: [doc, ...future],
      lastEdit: null,
      version: version + 1,
      saveState: "unsaved",
    });
  },

  redo: () => {
    const { doc, past, future, version } = get();
    if (!doc || future.length === 0) return;
    set({
      doc: future[0],
      past: [...past, doc],
      future: future.slice(1),
      lastEdit: null,
      version: version + 1,
      saveState: "unsaved",
    });
  },

  setSaveState: (saveState) => set({ saveState }),
  setActiveSection: (activeSectionId) => set({ activeSectionId }),
}));
