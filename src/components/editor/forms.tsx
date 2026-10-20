"use client";

import { useId, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { emptyCertification, emptyCustom, emptyEducation, emptyExperience, emptySkill, newId } from "@/lib/defaults";
import { useEditor } from "@/store/editor";
import type { CertificationItem, ResumeHeader, Section } from "@/types/resume";
import { Button, fieldLabelClass, Icon, IconButton, selectClass, TextField } from "@/components/ui";
import styles from "./forms.module.scss";
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
    <div className={styles.stack3}>
      <div className={styles.grid2}>
        <TextField label="First name" value={header.firstName} onChange={set("firstName")} autoComplete="off" />
        <TextField label="Last name" value={header.lastName} onChange={set("lastName")} autoComplete="off" />
      </div>
      <TextField label="Job title" value={header.title} onChange={set("title")} placeholder="e.g. Software Engineer" />
      <div className={styles.grid2}>
        <TextField label="Email" type="email" value={header.email} onChange={set("email")} />
        <TextField label="Phone" type="tel" value={header.phone} onChange={set("phone")} />
        <TextField label="City" value={header.city} onChange={set("city")} />
        <TextField label="Country" value={header.country} onChange={set("country")} />
      </div>

      <div>
        <div className={styles.caption}>Links</div>
        <div className={styles.stack2}>
          {header.links.map((l, i) => (
            <div key={l.id} className={styles.linkRow}>
              <TextField
                className={styles.linkLabel}
                label="Label"
                value={l.label}
                placeholder="LinkedIn"
                onChange={(v) => edit((d) => void (d.content.header.links[i].label = v), `link:${l.id}:label`)}
              />
              <TextField
                className={styles.grow}
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
          className={styles.addLink}
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
    <div className={styles.stack3}>
      <SortableList items={items} onMove={onMove}>
        {(item, index, handle) => (
          <div className={styles.itemCard}>
            <div className={styles.itemHead}>
              <DragHandle handle={handle} label={`Reorder ${summary(item) || noun}`} />
              <div className={styles.itemSummary}>{summary(item) || `New ${noun}`}</div>
              <IconButton icon="trash" label={`Remove ${noun}`} onClick={() => onRemove(index)} />
            </div>
            {render(item, index)}
          </div>
        )}
      </SortableList>
      <Button size="sm" variant="ghost" onClick={onAdd}>
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
        <div className={styles.stack3}>
          <div className={styles.grid2}>
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
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
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
        <div className={styles.stack3}>
          <div className={styles.grid2}>
            <TextField label="School" value={item.school} onChange={setField(i, item.id, "school")} className={styles.span2} />
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
    <div className={styles.stack2} data-skill-list>
      <SortableList items={section.items} onMove={(a, b) => editSection((s) => void (s.items = arrayMove(s.items, a, b)))}>
        {(item, i, handle) => (
          <div className={styles.skillRow}>
            <DragHandle handle={handle} label={`Reorder ${item.name || "skill"}`} />
            <input
              aria-label="Skill"
              className={styles.skillInput}
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
              className={styles.skillLevel}
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
      <Button size="sm" variant="ghost" onClick={() => editSection((s) => void s.items.push(emptySkill()))}>
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
        <div className={styles.stack3}>
          <div className={styles.grid3}>
            <TextField label="Title" value={item.heading} onChange={setField(i, item.id, "heading")} className={styles.span2} />
            <TextField label="Date" value={item.date} onChange={setField(i, item.id, "date")} placeholder="2024" />
          </div>
          <RichText label="Description" value={item.html} onChange={setField(i, item.id, "html")} />
        </div>
      )}
    />
  );
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** Newest first; extends 10 years ahead so future expiration dates can be picked. */
const YEARS = (() => {
  const now = new Date().getFullYear();
  return Array.from({ length: now + 10 - 1970 + 1 }, (_, k) => String(now + 10 - k));
})();

/** LinkedIn-style "Month" + "Year" dropdown pair. */
function MonthYearField({
  label,
  month,
  year,
  onChange,
}: {
  label: string;
  month: number;
  year: string;
  onChange: (next: { month: number; year: string }) => void;
}) {
  const id = useId();
  return (
    <fieldset>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.grid2}>
        <div>
          <label htmlFor={`${id}-m`} className={fieldLabelClass}>
            Month
          </label>
          <select id={`${id}-m`} className={selectClass} value={month} onChange={(e) => onChange({ month: Number(e.target.value), year })}>
            <option value={0}>Month</option>
            {MONTH_NAMES.map((m, k) => (
              <option key={m} value={k + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-y`} className={fieldLabelClass}>
            Year
          </label>
          <select id={`${id}-y`} className={selectClass} value={year} onChange={(e) => onChange({ month, year: e.target.value })}>
            <option value="">Year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>
    </fieldset>
  );
}

/** True when the expiration is earlier than the issue date (months only compared when both are set). */
function expiresBeforeIssued(i: CertificationItem): boolean {
  if (!i.issueYear || !i.expiryYear) return false;
  const iy = Number(i.issueYear);
  const ey = Number(i.expiryYear);
  if (ey !== iy || !i.issueMonth || !i.expiryMonth) return ey < iy;
  return i.expiryMonth < i.issueMonth;
}

const isBlankCertification = (i: CertificationItem) =>
  !i.name && !i.issuer && !i.issueYear && !i.issueMonth && !i.expiryYear && !i.expiryMonth && !i.credentialId && !i.credentialUrl;

function CertificationsForm({ section }: { section: SectionOf<"certifications"> }) {
  const editSection = useSectionEdit<"certifications">(section.id);
  // Fields the user has left at least once, so a brand-new blank entry isn't flagged immediately.
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const touch = (key: string) => setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));

  const setText = (i: number, id: string, field: "name" | "issuer" | "credentialId" | "credentialUrl") => (v: string) =>
    editSection((s) => void (s.items[i][field] = v), `${id}:${field}`);
  const setDate = (i: number, which: "issue" | "expiry") => (next: { month: number; year: string }) =>
    editSection((s) => {
      s.items[i][`${which}Month`] = next.month;
      s.items[i][`${which}Year`] = next.year;
    });

  const requiredError = (item: CertificationItem, field: "name" | "issuer", message: string) =>
    !item[field].trim() && (touched.has(`${item.id}:${field}`) || !isBlankCertification(item)) ? message : undefined;

  return (
    <ItemList
      items={section.items}
      noun="certification"
      summary={(i) => [i.name, i.issuer].filter(Boolean).join(" · ")}
      onMove={(a, b) => editSection((s) => void (s.items = arrayMove(s.items, a, b)))}
      onAdd={() => editSection((s) => void s.items.push(emptyCertification()))}
      onRemove={(i) => editSection((s) => void s.items.splice(i, 1))}
      render={(item, i) => (
        <div className={styles.stack4}>
          <p className={styles.requiredNote}>
            <span className={styles.requiredStar}>*</span> Indicates required
          </p>
          <TextField
            label="Name"
            required
            value={item.name}
            placeholder="Ex: Microsoft certified network associate security"
            onChange={setText(i, item.id, "name")}
            onBlur={() => touch(`${item.id}:name`)}
            error={requiredError(item, "name", "Name is required")}
          />
          <TextField
            label="Issuing organization"
            required
            value={item.issuer}
            placeholder="Ex: Microsoft"
            onChange={setText(i, item.id, "issuer")}
            onBlur={() => touch(`${item.id}:issuer`)}
            error={requiredError(item, "issuer", "Issuing organization is required")}
          />
          <MonthYearField label="Issue date" month={item.issueMonth} year={item.issueYear} onChange={setDate(i, "issue")} />
          <MonthYearField label="Expiration date" month={item.expiryMonth} year={item.expiryYear} onChange={setDate(i, "expiry")} />
          {expiresBeforeIssued(item) && (
            <p role="alert" className={styles.warning}>
              Expiration date can’t be earlier than the issue date.
            </p>
          )}
          <TextField label="Credential ID" value={item.credentialId} maxLength={80} onChange={setText(i, item.id, "credentialId")} />
          <TextField
            label="Credential URL"
            type="url"
            value={item.credentialUrl}
            placeholder="https://"
            onChange={setText(i, item.id, "credentialUrl")}
          />
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
    case "certifications":
      return <CertificationsForm section={section} />;
  }
}
