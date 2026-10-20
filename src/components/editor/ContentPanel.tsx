"use client";

import { useEffect, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useEditor } from "@/store/editor";
import type { ResumeContent, Section } from "@/types/resume";
import { Icon, IconButton } from "@/components/ui";
import { cx } from "@/lib/cx";
import styles from "./ContentPanel.module.scss";
import { HeaderForm, SectionForm } from "./forms";
import { DragHandle, SortableList, type HandleProps } from "./Sortable";

/** Accordion of the contact header plus every section; the open one follows clicks in the preview. */
export function ContentPanel({ content }: { content: ResumeContent }) {
  const active = useEditor((s) => s.activeSectionId);
  const setActive = useEditor((s) => s.setActiveSection);
  const edit = useEditor((s) => s.edit);

  return (
    <div className={styles.panel}>
      <Card id="header" title="Contact details" open={active === "header"} onToggle={() => setActive(active === "header" ? null : "header")}>
        <HeaderForm header={content.header} />
      </Card>

      <SortableList
        items={content.sections}
        onMove={(a, b) => edit((d) => void (d.content.sections = arrayMove(d.content.sections, a, b)))}
      >
        {(section, index, handle) => (
          <div className={styles.rowGap}>
            <Card
              id={section.id}
              title={section.title}
              open={active === section.id}
              onToggle={() => setActive(active === section.id ? null : section.id)}
              handle={handle}
              section={section}
              index={index}
            >
              <SectionForm section={section} />
            </Card>
          </div>
        )}
      </SortableList>
      {content.sections.length === 0 && <EmptySections />}
    </div>
  );
}

function Card({
  id,
  title,
  open,
  onToggle,
  handle,
  section,
  index,
  children,
}: {
  id: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  handle?: HandleProps;
  section?: Section;
  index?: number;
  children: React.ReactNode;
}) {
  const edit = useEditor((s) => s.edit);
  const ref = useRef<HTMLDivElement>(null);

  // When a section is opened from the preview, bring its form into view.
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  const bodyId = `section-body-${id}`;
  return (
    <div ref={ref} className={cx(styles.card, open && styles.cardOpen)}>
      <div className={styles.cardHeader}>
        {handle ? <DragHandle handle={handle} label={`Reorder ${title}`} /> : <span className={styles.handleSpacer} />}
        {section && open ? (
          <input
            aria-label="Section title"
            className={styles.titleInput}
            value={section.title}
            onChange={(e) =>
              edit((d) => {
                const s = d.content.sections[index!];
                if (s) s.title = e.target.value;
              }, `${id}:title`)
            }
          />
        ) : (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={bodyId}
            className={cx(styles.titleButton, section?.hidden && styles.titleHidden)}
          >
            {title || "Untitled section"}
          </button>
        )}
        {section && (
          <>
            <IconButton
              icon={section.hidden ? "eyeOff" : "eye"}
              label={section.hidden ? `Show ${title}` : `Hide ${title}`}
              onClick={() => edit((d) => void (d.content.sections[index!].hidden = !section.hidden))}
            />
            <IconButton
              icon="trash"
              label={`Delete ${title}`}
              onClick={() => {
                if (confirm(`Delete the "${title}" section?`)) edit((d) => void d.content.sections.splice(index!, 1));
              }}
            />
          </>
        )}
        <IconButton icon={open ? "chevronDown" : "chevronRight"} label={open ? "Collapse" : "Expand"} onClick={onToggle} aria-expanded={open} aria-controls={bodyId} />
      </div>
      {open && (
        <div id={bodyId} className={styles.cardBody}>
          {children}
        </div>
      )}
    </div>
  );
}

export function EmptySections() {
  return (
    <p className={styles.empty}>
      <Icon name="plus" /> Use “Add section” to start your resume.
    </p>
  );
}
