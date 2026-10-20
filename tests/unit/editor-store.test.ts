import { beforeEach, describe, expect, it, vi } from "vitest";
import { blankContent, DEFAULT_STYLE } from "@/lib/defaults";
import { useEditor } from "@/store/editor";
import type { ResumeDoc } from "@/types/resume";

const doc = (): ResumeDoc => ({
  id: "r1",
  name: "Test",
  templateId: "classic",
  style: DEFAULT_STYLE,
  content: blankContent(),
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
});

const state = () => useEditor.getState();

describe("editor store", () => {
  beforeEach(() => {
    vi.useRealTimers();
    state().load(doc());
  });

  it("applies edits to a copy and marks the doc unsaved", () => {
    const before = state().doc!;
    state().edit((d) => void (d.content.header.firstName = "Ada"));
    expect(state().doc!.content.header.firstName).toBe("Ada");
    expect(before.content.header.firstName).toBe("");
    expect(state().saveState).toBe("unsaved");
    expect(state().version).toBe(1);
  });

  it("undoes and redoes", () => {
    state().edit((d) => void (d.name = "A"));
    state().edit((d) => void (d.name = "B"));
    state().undo();
    expect(state().doc!.name).toBe("A");
    state().undo();
    expect(state().doc!.name).toBe("Test");
    state().redo();
    expect(state().doc!.name).toBe("A");
  });

  it("coalesces rapid edits with the same key into one undo step", () => {
    vi.useFakeTimers();
    for (const v of ["I", "In", "Ini"]) {
      state().edit((d) => void (d.content.header.firstName = v), "header:firstName");
      vi.advanceTimersByTime(100);
    }
    expect(state().past).toHaveLength(1);
    state().undo();
    expect(state().doc!.content.header.firstName).toBe("");
  });

  it("starts a new undo step after a pause or a different key", () => {
    vi.useFakeTimers();
    state().edit((d) => void (d.content.header.firstName = "A"), "header:firstName");
    vi.advanceTimersByTime(1500);
    state().edit((d) => void (d.content.header.firstName = "AB"), "header:firstName");
    state().edit((d) => void (d.content.header.lastName = "C"), "header:lastName");
    expect(state().past).toHaveLength(3);
  });

  it("clears redo history after a new edit", () => {
    state().edit((d) => void (d.name = "A"));
    state().undo();
    state().edit((d) => void (d.name = "B"));
    expect(state().future).toHaveLength(0);
  });
});
