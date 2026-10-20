"use client";

import { useState } from "react";
import { makeSection, SECTION_PRESETS } from "@/lib/defaults";
import { useEditor, type Snapshot } from "@/store/editor";
import { Button, Icon, Input } from "@/components/ui";
import styles from "./AddSectionPanel.module.scss";

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
    <div className={styles.panel}>
      <div>
        <h3 className={styles.heading}>Suggested sections</h3>
        <div className={styles.presets}>
          {SECTION_PRESETS.map((p) => {
            const added = existing.has(p.title.toLowerCase());
            return (
              <button
                key={p.key}
                type="button"
                disabled={added}
                onClick={() => add(p.type, p.title, p.column)}
                className={styles.preset}
              >
                <Icon name={added ? "check" : "plus"} className={styles.presetIcon} />
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
        <h3 className={styles.heading}>Custom section</h3>
        <div className={styles.customRow}>
          <Input aria-label="Custom section title" placeholder="e.g. Volunteering" value={custom} onChange={(e) => setCustom(e.target.value)} />
          <Button type="submit" variant="primary" disabled={!custom.trim()}>
            Add
          </Button>
        </div>
      </form>
    </div>
  );
}
