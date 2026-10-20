"use client";

import { FONTS, TEMPLATES } from "@/components/renderer/ResumeRenderer";
import { ACCENT_SWATCHES, DEFAULT_STYLE } from "@/lib/defaults";
import { useEditor, type Snapshot } from "@/store/editor";
import { FONT_IDS, TEMPLATE_IDS, type ResumeStyle } from "@/types/resume";
import { Button } from "@/components/ui";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Small schematic of each template's layout, drawn with divs. */
function TemplateSketch({ id, accent }: { id: (typeof TEMPLATE_IDS)[number]; accent: string }) {
  const line = (w: string, c = "#d4d4d8") => <div className="h-1 rounded" style={{ width: w, background: c }} />;
  if (id === "sidebar")
    return (
      <div className="flex h-full flex-col gap-1.5 p-2">
        <div className="h-2 w-2/3 rounded" style={{ background: "#3f3f46" }} />
        <div className="h-0.5" style={{ background: accent }} />
        <div className="flex flex-1 gap-2">
          <div className="w-1/3 space-y-1 border-r border-neutral-200 pr-1">{[1, 2, 3, 4].map((n) => <div key={n}>{line("90%")}</div>)}</div>
          <div className="flex-1 space-y-1">{[1, 2, 3, 4, 5, 6].map((n) => <div key={n}>{line(n % 3 ? "100%" : "60%", n === 1 ? accent : undefined)}</div>)}</div>
        </div>
      </div>
    );
  if (id === "modern")
    return (
      <div className="flex h-full flex-col gap-1.5 p-2">
        <div className="flex gap-1 border-l-2 pl-1" style={{ borderColor: accent }}>
          <div className="h-2 w-1/3 rounded bg-neutral-300" />
          <div className="h-2 w-1/3 rounded" style={{ background: accent }} />
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex gap-1.5">
            <div className="w-1/4">{line("100%", accent)}</div>
            <div className="flex-1 space-y-1">{line("100%")}{line("80%")}</div>
          </div>
        ))}
      </div>
    );
  return (
    <div className="flex h-full flex-col items-center gap-1.5 p-2">
      <div className="h-2 w-1/2 rounded bg-neutral-700" />
      {line("70%")}
      {[1, 2, 3].map((n) => (
        <div key={n} className="w-full space-y-1">
          <div className="h-0.5 w-full" style={{ background: accent }} />
          {line("100%")}
          {line("75%")}
        </div>
      ))}
    </div>
  );
}

export function DesignPanel({ doc }: { doc: Snapshot }) {
  const edit = useEditor((s) => s.edit);
  const setStyle = <K extends keyof ResumeStyle>(key: K, value: ResumeStyle[K], coalesce = false) =>
    edit((d) => void (d.style[key] = value), coalesce ? `style:${key}` : undefined);
  const { style } = doc;
  const twoColumn = TEMPLATES[doc.templateId].twoColumn;

  return (
    <div className="space-y-6 p-4">
      <Group title="Template">
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => edit((d) => void (d.templateId = id))}
              aria-pressed={doc.templateId === id}
              className={`overflow-hidden rounded-lg border-2 bg-white text-left transition ${doc.templateId === id ? "border-blue-600" : "border-neutral-200 hover:border-neutral-300"}`}
            >
              <div className="aspect-[3/4] bg-white">
                <TemplateSketch id={id} accent={style.accent} />
              </div>
              <div className="border-t border-neutral-100 px-2 py-1 text-xs font-medium">{TEMPLATES[id].label}</div>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Accent color">
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Accent ${c}`}
              aria-pressed={style.accent === c}
              onClick={() => setStyle("accent", c)}
              className={`h-7 w-7 rounded-full ring-offset-2 ${style.accent === c ? "ring-2 ring-neutral-800" : ""}`}
              style={{ background: c }}
            />
          ))}
          <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-neutral-300" title="Custom color">
            <span className="sr-only">Custom accent color</span>
            <input
              type="color"
              value={style.accent}
              onChange={(e) => setStyle("accent", e.target.value, true)}
              className="absolute -inset-2 h-12 w-12 cursor-pointer"
            />
          </label>
        </div>
      </Group>

      <Group title="Font">
        <select
          aria-label="Font family"
          value={style.font}
          onChange={(e) => setStyle("font", e.target.value as ResumeStyle["font"])}
          className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm"
        >
          {FONT_IDS.map((f) => (
            <option key={f} value={f}>
              {FONTS[f].label}
            </option>
          ))}
        </select>
        <div className="flex rounded-md border border-neutral-300 bg-white p-0.5" role="radiogroup" aria-label="Font size">
          {(["S", "M", "L"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={style.fontSize === s}
              onClick={() => setStyle("fontSize", s)}
              className={`flex-1 rounded py-1 text-sm ${style.fontSize === s ? "bg-blue-700 text-white" : "text-neutral-700 hover:bg-neutral-100"}`}
            >
              {{ S: "Small", M: "Normal", L: "Large" }[s]}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Spacing">
        <Slider label="Section spacing" min={0.5} max={2} step={0.1} value={style.sectionSpacing} onChange={(v) => setStyle("sectionSpacing", v, true)} />
        <Slider label="Line spacing" min={1} max={2} step={0.05} value={style.lineHeight} onChange={(v) => setStyle("lineHeight", v, true)} />
      </Group>

      <Group title="Paper size">
        <div className="flex gap-4 text-sm">
          {(["A4", "LETTER"] as const).map((p) => (
            <label key={p} className="flex items-center gap-1.5">
              <input type="radio" name="paper" className="accent-blue-700" checked={style.paper === p} onChange={() => setStyle("paper", p)} />
              {p === "A4" ? "A4" : "US Letter"}
            </label>
          ))}
        </div>
      </Group>

      {twoColumn && (
        <Group title="Columns">
          <p className="text-xs text-neutral-500">Choose which column each section appears in.</p>
          <div className="divide-y divide-neutral-100 rounded-md border border-neutral-200 bg-white">
            {doc.content.sections.map((s, i) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                <span className={s.hidden ? "text-neutral-400" : ""}>{s.title}</span>
                <select
                  aria-label={`Column for ${s.title}`}
                  value={s.column}
                  onChange={(e) => edit((d) => void (d.content.sections[i].column = Number(e.target.value) as 0 | 1))}
                  className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-sm"
                >
                  <option value={0}>Left</option>
                  <option value={1}>Right</option>
                </select>
              </div>
            ))}
          </div>
        </Group>
      )}

      <Button variant="secondary" size="sm" onClick={() => edit((d) => void (d.style = { ...DEFAULT_STYLE, paper: d.style.paper }))}>
        Reset design to default
      </Button>
    </div>
  );
}

function Slider({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between text-neutral-700">
        {label} <span className="tabular-nums text-neutral-500">{value.toFixed(2).replace(/0$/, "")}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-blue-700" />
    </label>
  );
}
