"use client";

import { FONTS, TEMPLATES } from "@/components/renderer/ResumeRenderer";
import { ACCENT_SWATCHES, DEFAULT_STYLE } from "@/lib/defaults";
import { useEditor, type Snapshot } from "@/store/editor";
import { FONT_IDS, TEMPLATE_IDS, type ResumeStyle } from "@/types/resume";
import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";
import styles from "./DesignPanel.module.scss";

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.groupTitle}>{title}</legend>
      {children}
    </fieldset>
  );
}

/** Small schematic of each template's layout, drawn with divs. */
function TemplateSketch({ id, accent }: { id: (typeof TEMPLATE_IDS)[number]; accent: string }) {
  const line = (w: string, c = "#d4d4d8") => <div className={styles.sketchLine} style={{ width: w, background: c }} />;
  if (id === "sidebar")
    return (
      <div className={styles.sketch}>
        <div className={cx(styles.sketchTitle, styles.w23)} style={{ background: "#3f3f46" }} />
        <div className={styles.sketchRule} style={{ background: accent }} />
        <div className={styles.sketchBody}>
          <div className={cx(styles.sketchSide, styles.stack)}>{[1, 2, 3, 4].map((n) => <div key={n}>{line("90%")}</div>)}</div>
          <div className={cx(styles.sketchMain, styles.stack)}>{[1, 2, 3, 4, 5, 6].map((n) => <div key={n}>{line(n % 3 ? "100%" : "60%", n === 1 ? accent : undefined)}</div>)}</div>
        </div>
      </div>
    );
  if (id === "modern")
    return (
      <div className={styles.sketch}>
        <div className={styles.sketchHeader} style={{ borderColor: accent }}>
          <div className={cx(styles.sketchTitle, styles.w13, styles.bgNeutral300)} />
          <div className={cx(styles.sketchTitle, styles.w13)} style={{ background: accent }} />
        </div>
        {[1, 2, 3].map((n) => (
          <div key={n} className={styles.sketchRow}>
            <div className={styles.w14}>{line("100%", accent)}</div>
            <div className={cx(styles.sketchMain, styles.stack)}>{line("100%")}{line("80%")}</div>
          </div>
        ))}
      </div>
    );
  return (
    <div className={cx(styles.sketch, styles.sketchCentered)}>
      <div className={cx(styles.sketchTitle, styles.w12, styles.bgNeutral700)} />
      {line("70%")}
      {[1, 2, 3].map((n) => (
        <div key={n} className={cx(styles.sketchFull, styles.stack)}>
          <div className={cx(styles.sketchRule, styles.sketchFull)} style={{ background: accent }} />
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
    <div className={styles.panel}>
      <Group title="Template">
        <div className={styles.templates}>
          {TEMPLATE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => edit((d) => void (d.templateId = id))}
              aria-pressed={doc.templateId === id}
              className={cx(styles.template, doc.templateId === id && styles.templateSelected)}
            >
              <div className={styles.templateThumb}>
                <TemplateSketch id={id} accent={style.accent} />
              </div>
              <div className={styles.templateLabel}>{TEMPLATES[id].label}</div>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Accent color">
        <div className={styles.swatches}>
          {ACCENT_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Accent ${c}`}
              aria-pressed={style.accent === c}
              onClick={() => setStyle("accent", c)}
              className={cx(styles.swatch, style.accent === c && styles.swatchSelected)}
              style={{ background: c }}
            />
          ))}
          <label className={styles.customColor} title="Custom color">
            <span className={styles.srOnly}>Custom accent color</span>
            <input
              type="color"
              value={style.accent}
              onChange={(e) => setStyle("accent", e.target.value, true)}
              className={styles.customColorInput}
            />
          </label>
        </div>
      </Group>

      <Group title="Font">
        <select
          aria-label="Font family"
          value={style.font}
          onChange={(e) => setStyle("font", e.target.value as ResumeStyle["font"])}
          className={styles.fontSelect}
        >
          {FONT_IDS.map((f) => (
            <option key={f} value={f}>
              {FONTS[f].label}
            </option>
          ))}
        </select>
        <div className={styles.segmented} role="radiogroup" aria-label="Font size">
          {(["S", "M", "L"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={style.fontSize === s}
              onClick={() => setStyle("fontSize", s)}
              className={cx(styles.segment, style.fontSize === s && styles.segmentActive)}
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
        <div className={styles.paperOptions}>
          {(["A4", "LETTER"] as const).map((p) => (
            <label key={p} className={styles.paperOption}>
              <input type="radio" name="paper" className={styles.radio} checked={style.paper === p} onChange={() => setStyle("paper", p)} />
              {p === "A4" ? "A4" : "US Letter"}
            </label>
          ))}
        </div>
      </Group>

      {twoColumn && (
        <Group title="Columns">
          <p className={styles.hint}>Choose which column each section appears in.</p>
          <div className={styles.columnList}>
            {doc.content.sections.map((s, i) => (
              <div key={s.id} className={styles.columnRow}>
                <span className={cx(s.hidden && styles.columnHidden)}>{s.title}</span>
                <select
                  aria-label={`Column for ${s.title}`}
                  value={s.column}
                  onChange={(e) => edit((d) => void (d.content.sections[i].column = Number(e.target.value) as 0 | 1))}
                  className={styles.columnSelect}
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
    <label className={styles.slider}>
      <span className={styles.sliderHead}>
        {label} <span className={styles.sliderValue}>{value.toFixed(2).replace(/0$/, "")}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className={styles.range} />
    </label>
  );
}
