"use client";

import { useState } from "react";
import { makeSection, SECTION_PRESETS } from "@/lib/defaults";
import { useEditor, type Snapshot } from "@/store/editor";
import { Button, Icon, Input } from "@/components/ui";

/** Preset sections (greyed out once added) plus a custom section with any title. */
export function AddSectionPanel({ doc, onAdded }: { doc: Snapshot; onAdded: () => void }) {
  const edit = useEditor((s) => s.edit);
  const setActive = useEditor((s) => s.setActiveSection);
  const [custom, setCustom] = useState("");
  const existing = new Set(doc.content.sections.map((s) => s.title.trim().toLowerCase()));

  const add = (type: Parameters<typeof makeSection>[0], title: string, column: 0 | 1) => {
    const section = makeSection(type, title, column);
    edit((d) => void d.content.sections.push(section));
    setActive(section.id);
    onAdded();
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Suggested sections</h3>
        <div className="grid grid-cols-2 gap-2">
          {SECTION_PRESETS.map((p) => {
            const added = existing.has(p.title.toLowerCase());
            return (
              <button
                key={p.key}
                type="button"
                disabled={added}
                onClick={() => add(p.type, p.title, p.column)}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-sm font-medium text-neutral-800 hover:border-blue-300 hover:bg-blue-50 disabled:cursor-default disabled:bg-neutral-50 disabled:text-neutral-400 disabled:hover:border-neutral-200"
              >
                <Icon name={added ? "check" : "plus"} className="h-4 w-4 shrink-0" />
                {p.title}
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) {
            add("custom", custom.trim(), 1);
            setCustom("");
          }
        }}
      >
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Custom section</h3>
        <div className="flex gap-2">
          <Input aria-label="Custom section title" placeholder="e.g. Volunteering" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!custom.trim()}>
            Add
          </Button>
        </div>
      </form>
    </div>
  );
}
