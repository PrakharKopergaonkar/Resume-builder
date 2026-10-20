"use client";

import { useEffect, useRef } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { useEditor } from "@/store/editor";
import type { ResumeContent, Section } from "@/types/resume";
import { Icon, IconButton } from "@/components/ui";
import { HeaderForm, SectionForm } from "./forms";
import { DragHandle, SortableList, type HandleProps } from "./Sortable";

/** Accordion of the contact header plus every section; the open one follows clicks in the preview. */
export function ContentPanel({ content }: { content: ResumeContent }) {
  const active = useEditor((s) => s.activeSectionId);
  const setActive = useEditor((s) => s.setActiveSection);
  const edit = useEditor((s) => s.edit);

  return (
    <div className="space-y-2 p-4">
      <Card id="header" title="Contact details" open={active === "header"} onToggle={() => setActive(active === "header" ? null : "header")}>
        <HeaderForm header={content.header} />
      </Card>

      <SortableList
        items={content.sections}
        onMove={(a, b) => edit((d) => void (d.content.sections = arrayMove(d.content.sections, a, b)))}
      >
        {(section, index, handle) => (
          <div className="pt-2">
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
    <div ref={ref} className={`rounded-xl border bg-white shadow-sm ${open ? "border-blue-300 ring-1 ring-blue-200" : "border-neutral-200"}`}>
      <div className="flex items-center gap-1 px-2 py-1.5">
        {handle ? <DragHandle handle={handle} label={`Reorder ${title}`} /> : <span className="w-6" />}
        {section && open ? (
          <input
            aria-label="Section title"
            className="min-w-0 flex-1 rounded px-1.5 py-1 text-[15px] font-semibold text-neutral-900 hover:bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20"
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
            className={`min-w-0 flex-1 truncate px-1.5 py-1 text-left text-[15px] font-semibold ${section?.hidden ? "text-neutral-400 line-through" : "text-neutral-900"}`}
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
        <div id={bodyId} className="border-t border-neutral-100 px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

export function EmptySections() {
  return (
    <p className="flex items-center gap-2 px-4 text-sm text-neutral-500">
      <Icon name="plus" /> Use “Add section” to start your resume.
    </p>
  );
}
