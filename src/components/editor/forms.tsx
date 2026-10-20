"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { emptyCustom, emptyEducation, emptyExperience, emptySkill, newId } from "@/lib/defaults";
import { useEditor } from "@/store/editor";
import type { ResumeHeader, Section } from "@/types/resume";
import { Button, Icon, IconButton, TextField } from "@/components/ui";
import { RichText } from "./RichText";
import { DragHandle, SortableList } from "./Sortable";

type SectionOf<T extends Section["type"]> = Extract<Section, { type: T }>;

/** Mutates one section in the store; `key` groups keystrokes into a single undo step. */
function useSectionEdit<T extends Section["type"]>(sectionId: string) {
  const edit = useEditor((s) => s.edit);
  return (recipe: (s: SectionOf<T>) => void, key?: string) =>
    edit((d) => {
      const s = d.content.sections.find((x) => x.id === sectionId);
      if (s) recipe(s as SectionOf<T>);
    }, key && `${sectionId}:${key}`);
}

/* ---------------- header / contact ---------------- */

export function HeaderForm({ header }: { header: ResumeHeader }) {
  const edit = useEditor((s) => s.edit);
  const set = (field: Exclude<keyof ResumeHeader, "links">) => (v: string) =>
    edit((d) => {
      d.content.header[field] = v;
    }, `header:${field}`);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="First name" value={header.firstName} onChange={set("firstName")} autoComplete="off" />
        <TextField label="Last name" value={header.lastName} onChange={set("lastName")} autoComplete="off" />
      </div>
      <TextField label="Job title" value={header.title} onChange={set("title")} placeholder="e.g. Software Engineer" />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Email" type="email" value={header.email} onChange={set("email")} />
        <TextField label="Phone" type="tel" value={header.phone} onChange={set("phone")} />
        <TextField label="City" value={header.city} onChange={set("city")} />
        <TextField label="Country" value={header.country} onChange={set("country")} />
      </div>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Links</div>
        <div className="space-y-2">
          {header.links.map((l, i) => (
            <div key={l.id} className="flex items-end gap-2">
              <TextField
                className="w-1/3"
                label="Label"
                value={l.label}
                placeholder="LinkedIn"
                onChange={(v) => edit((d) => void (d.content.header.links[i].label = v), `link:${l.id}:label`)}
              />
              <TextField
                className="flex-1"
                label="URL"
                value={l.url}
                placeholder="linkedin.com/in/you"
                onChange={(v) => edit((d) => void (d.content.header.links[i].url = v), `link:${l.id}:url`)}
              />
              <IconButton icon="trash" label="Remove link" onClick={() => edit((d) => void d.content.header.links.splice(i, 1))} />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="mt-2 text-blue-700"
          onClick={() => edit((d) => void d.content.header.links.push({ id: newId(), label: "", url: "" }))}
        >
          <Icon name="plus" /> Add link
        </Button>
      </div>
    </div>
  );
}

/* ---------------- generic item list ---------------- */

function ItemList<I extends { id: string }>({
  items,
  noun,
  onMove,
  onAdd,
  onRemove,
  summary,
  render,
}: {
  items: I[];
  noun: string;
  onMove: (from: number, to: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  summary: (item: I) => string;
  render: (item: I, index: number) => React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <SortableList items={items} onMove={onMove}>
        {(item, index, handle) => (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3">
            <div className="mb-2 flex items-center gap-1">
              <DragHandle handle={handle} label={`Reorder ${summary(item) || noun}`} />
              <div className="flex-1 truncate text-sm font-semibold text-neutral-700">{summary(item) || `New ${noun}`}</div>
              <IconButton icon="trash" label={`Remove ${noun}`} onClick={() => onRemove(index)} />
            </div>
            {render(item, index)}
          </div>
        )}
      </SortableList>
      <Button size="sm" variant="ghost" className="text-blue-700" onClick={onAdd}>
        <Icon name="plus" /> Add {noun}
      </Button>
    </div>
  );
}

/* ---------------- per-section forms ---------------- */

function SummaryForm({ section }: { section: SectionOf<"summary"> }) {
  const editSection = useSectionEdit<"summary">(section.id);
  return (
    <RichText
      label={section.title}
      value={section.html}
      placeholder="2–4 sentences on who you are and what you're great at."
      onChange={(html) => editSection((s) => void (s.html = html), "html")}
    />
  );
}

function ExperienceForm({ section }: { section: SectionOf<"experience"> }) {
  const editSection = useSectionEdit<"experience">(section.id);
  const setField =
    (i: number, id: string, field: "title" | "company" | "city" | "country" | "start" | "end" | "html") => (v: string) =>
      editSection((s) => void (s.items[i][field] = v), `${id}:${field}`);
  return (
    <ItemList
      items={section.items}
      noun="position"
      summary={(i) => [i.title, i.company].filter(Boolean).join(" · ")}
      onMove={(a, b) => editSection((s) => void (s.items = arrayMove(s.items, a, b)))}
      onAdd={() => editSection((s) => void s.items.push(emptyExperience()))}
      onRemove={(i) => editSection((s) => void s.items.splice(i, 1))}
      render={(item, i) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Job title" value={item.title} onChange={setField(i, item.id, "title")} />
            <TextField label="Employer" value={item.company} onChange={setField(i, item.id, "company")} />
            <TextField label="City" value={item.city} onChange={setField(i, item.id, "city")} />
            <TextField label="Country" value={item.country} onChange={setField(i, item.id, "country")} />
            <TextField label="Start date" type="month" value={item.start} onChange={setField(i, item.id, "start")} />
            <TextField
              label="End date"
              type="month"
              value={item.current ? "" : item.end}
              disabled={item.current}
              onChange={setField(i, item.id, "end")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-700"
              checked={item.current}
              onChange={(e) => editSection((s) => void (s.items[i].current = e.target.checked))}
            />
            I currently work here
          </label>
          <RichText
            label="Description"
            value={item.html}
            placeholder="Achievements and responsibilities, one bullet each."
            onChange={setField(i, item.id, "html")}
          />
        </div>
      )}
    />
  );
}

function EducationForm({ section }: { section: SectionOf<"education"> }) {
  const editSection = useSectionEdit<"education">(section.id);
  const setField = (i: number, id: string, field: "school" | "degree" | "field" | "city" | "gradYear" | "html") => (v: string) =>
    editSection((s) => void (s.items[i][field] = v), `${id}:${field}`);
  return (
    <ItemList
      items={section.items}
      noun="school"
      summary={(i) => [i.degree, i.school].filter(Boolean).join(" · ")}
      onMove={(a, b) => editSection((s) => void (s.items = arrayMove(s.items, a, b)))}
      onAdd={() => editSection((s) => void s.items.push(emptyEducation()))}
      onRemove={(i) => editSection((s) => void s.items.splice(i, 1))}
      render={(item, i) => (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <TextField label="School" value={item.school} onChange={setField(i, item.id, "school")} className="col-span-2" />
            <TextField label="Degree" value={item.degree} onChange={setField(i, item.id, "degree")} placeholder="B.S." />
            <TextField label="Field of study" value={item.field} onChange={setField(i, item.id, "field")} />
            <TextField label="City" value={item.city} onChange={setField(i, item.id, "city")} />
            <TextField label="Graduation year" value={item.gradYear} onChange={setField(i, item.id, "gradYear")} inputMode="numeric" />
          </div>
          <RichText label="Details" value={item.html} placeholder="Honors, coursework, GPA (optional)" onChange={setField(i, item.id, "html")} />
        </div>
      )}
    />
  );
}

function SkillsForm({ section }: { section: SectionOf<"skills"> }) {
  const editSection = useSectionEdit<"skills">(section.id);
  return (
    <div className="space-y-2" data-skill-list>
      <SortableList items={section.items} onMove={(a, b) => editSection((s) => void (s.items = arrayMove(s.items, a, b)))}>
        {(item, i, handle) => (
          <div className="flex items-center gap-1.5 py-0.5">
            <DragHandle handle={handle} label={`Reorder ${item.name || "skill"}`} />
            <input
              aria-label="Skill"
              className="block min-w-0 flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
              value={item.name}
              placeholder="Skill"
              onChange={(e) => editSection((s) => void (s.items[i].name = e.target.value), `${item.id}:name`)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const list = e.currentTarget.closest("[data-skill-list]");
                  editSection((s) => void s.items.splice(i + 1, 0, emptySkill()));
                  requestAnimationFrame(() => list?.querySelectorAll<HTMLInputElement>('input[aria-label="Skill"]')[i + 1]?.focus());
                }
              }}
            />
            <select
              aria-label="Skill level"
              className="rounded-md border border-neutral-300 bg-white px-1.5 py-1.5 text-sm"
              value={item.level}
              onChange={(e) => editSection((s) => void (s.items[i].level = Number(e.target.value)))}
            >
              <option value={0}>No level</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {"●".repeat(n)}
                </option>
              ))}
            </select>
            <IconButton icon="trash" label="Remove skill" onClick={() => editSection((s) => void s.items.splice(i, 1))} />
          </div>
        )}
      </SortableList>
      <Button size="sm" variant="ghost" className="text-blue-700" onClick={() => editSection((s) => void s.items.push(emptySkill()))}>
        <Icon name="plus" /> Add {section.title.toLowerCase().endsWith("s") ? section.title.toLowerCase().slice(0, -1) : "item"}
      </Button>
    </div>
  );
}

function CustomForm({ section }: { section: SectionOf<"custom"> }) {
  const editSection = useSectionEdit<"custom">(section.id);
  const setField = (i: number, id: string, field: "heading" | "date" | "html") => (v: string) =>
    editSection((s) => void (s.items[i][field] = v), `${id}:${field}`);
  return (
    <ItemList
      items={section.items}
      noun="entry"
      summary={(i) => i.heading}
      onMove={(a, b) => editSection((s) => void (s.items = arrayMove(s.items, a, b)))}
      onAdd={() => editSection((s) => void s.items.push(emptyCustom()))}
      onRemove={(i) => editSection((s) => void s.items.splice(i, 1))}
      render={(item, i) => (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <TextField label="Title" value={item.heading} onChange={setField(i, item.id, "heading")} className="col-span-2" />
            <TextField label="Date" value={item.date} onChange={setField(i, item.id, "date")} placeholder="2024" />
          </div>
          <RichText label="Description" value={item.html} onChange={setField(i, item.id, "html")} />
        </div>
      )}
    />
  );
}

export function SectionForm({ section }: { section: Section }) {
  switch (section.type) {
    case "summary":
      return <SummaryForm section={section} />;
    case "experience":
      return <ExperienceForm section={section} />;
    case "education":
      return <EducationForm section={section} />;
    case "skills":
      return <SkillsForm section={section} />;
    case "custom":
      return <CustomForm section={section} />;
  }
}
