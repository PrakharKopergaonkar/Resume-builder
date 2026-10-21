"use client";

import { useEffect, useRef, useState } from "react";
import { isDeepStrictEqual } from "@/lib/deepEqual";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Annotation } from "@codemirror/state";
import { yaml, yamlLanguage } from "@codemirror/lang-yaml";
import { startCompletion, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { lintGutter, setDiagnostics, type Diagnostic } from "@codemirror/lint";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { fromYaml, toYaml, type YamlError } from "@/lib/codec/yaml";
import { suggest, unknownKeys, type KeyWarning } from "@/lib/codec/hints";
import { useEditor } from "@/store/editor";
import { Button, Icon } from "@/components/ui";
import styles from "./CodePanel.module.scss";

const APPLY_DELAY_MS = 400; // apply valid YAML this long after the last keystroke
const TYPING_GRACE_MS = 1500; // don't rewrite the text under someone who is still typing

/** Marks text changes made by this component (regenerating YAML), so they aren't treated as user edits. */
const regenerated = Annotation.define<boolean>();

// Colors come from the app's theme variables, so the editor follows light and dark mode.
const theme = EditorView.theme({
  "&": { height: "100%", fontSize: "13px", backgroundColor: "var(--surface)", color: "var(--page-text)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", lineHeight: "1.55" },
  ".cm-gutters": { backgroundColor: "var(--neutral-50)", color: "var(--neutral-500)", borderRight: "1px solid var(--neutral-200)" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklab, var(--blue-50) 55%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--blue-50)", color: "var(--neutral-800)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--page-text)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--blue-100)",
  },
  ".cm-tooltip": { backgroundColor: "var(--surface)", color: "var(--page-text)", border: "1px solid var(--neutral-200)" },
  ".cm-tooltip.cm-tooltip-autocomplete > ul": { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace", maxHeight: "16em" },
  ".cm-tooltip.cm-tooltip-autocomplete > ul > li": { padding: "2px 8px" },
  ".cm-tooltip-autocomplete ul li[aria-selected]": { backgroundColor: "var(--blue-100)", color: "var(--page-text)" },
  ".cm-completionDetail": { color: "var(--neutral-500)", fontStyle: "normal", marginLeft: "1em" },
  ".cm-completionMatchedText": { textDecoration: "none", fontWeight: "600", color: "var(--accent-text)" },
  ".cm-tooltip.cm-completionInfo": { maxWidth: "18em", padding: "4px 8px", fontSize: "12px" },
});

/** Suggests the keys allowed at the cursor and the accepted values after "key: " (see codec/hints.ts). */
function completeResumeYaml(context: CompletionContext): CompletionResult | null {
  const result = suggest(context.state.doc.toString(), context.pos, context.explicit);
  if (!result) return null;
  const options = result.options.map<Completion>((o, i) => ({
    label: o.label,
    boost: Math.max(-99, 50 - i), // keep the schema's order (e.g. "type" first) instead of alphabetical
    detail: o.detail,
    info: o.info,
    type: o.kind === "key" ? "property" : "enum",
    apply: (view, _completion, from, to) => {
      view.dispatch({ changes: { from, to, insert: o.insert }, selection: { anchor: from + o.insert.length }, userEvent: "input.complete" });
      if (o.reopen) setTimeout(() => startCompletion(view)); // a key with fixed values: show them right away
    },
  }));
  return { from: result.from, to: result.to, options, validFor: /^[\w"#.-]*$/ };
}

const highlight = HighlightStyle.define([
  { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: "var(--accent-text)" },
  { tag: tags.comment, color: "var(--neutral-500)", fontStyle: "italic" },
  { tag: [tags.number, tags.bool, tags.null, tags.atom], color: "var(--danger-text)" },
  { tag: [tags.punctuation, tags.separator, tags.meta], color: "var(--neutral-500)" },
  { tag: [tags.string, tags.content], color: "var(--page-text)" },
]);

type Status = { kind: "valid"; warnings: KeyWarning[] } | { kind: "invalid"; errors: YamlError[]; warnings: KeyWarning[] } | { kind: "checking" };

/**
 * The resume as YAML. Valid edits apply to the editor store (undoable, autosaved, live preview); invalid text never
 * touches the resume and shows its errors inline. Changes made elsewhere (forms, Design tab, undo) regenerate the
 * text unless the user is mid-edit.
 */
export function CodePanel() {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "valid", warnings: [] });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const initial = useEditor.getState().doc;
    if (!host || !initial) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastTypedAt = 0;
    let appliedVersion = -1; // store version produced by our own edit (don't regenerate for it)
    let invalid = false;

    const showErrors = (view: EditorView, errors: YamlError[], warnings: KeyWarning[] = []) => {
      const { doc } = view.state;
      const toDiagnostic = (e: YamlError | KeyWarning, severity: Diagnostic["severity"]): Diagnostic => {
        const line = doc.line(Math.min(Math.max(e.line, 1), doc.lines));
        const from = Math.min(line.from + Math.max(e.column - 1, 0), line.to);
        return { from, to: Math.max(from, line.to), severity, message: e.message };
      };
      const diagnostics = [...errors.map((e) => toDiagnostic(e, "error")), ...warnings.map((w) => toDiagnostic(w, "warning"))];
      view.dispatch(setDiagnostics(view.state, diagnostics));
    };

    const apply = (view: EditorView) => {
      const store = useEditor.getState();
      if (!store.doc) return;
      const text = view.state.doc.toString();
      const result = fromYaml(text, store.doc);
      const warnings = unknownKeys(text);
      if (!result.ok) {
        invalid = true;
        setStatus({ kind: "invalid", errors: result.errors, warnings });
        showErrors(view, result.errors, warnings);
        return;
      }
      invalid = false;
      setStatus({ kind: "valid", warnings });
      showErrors(view, [], warnings);
      if (isDeepStrictEqual(result.doc, store.doc)) return; // e.g. only whitespace or comments changed
      store.edit((d) => {
        d.name = result.doc.name;
        d.templateId = result.doc.templateId;
        d.style = result.doc.style;
        d.content = result.doc.content;
      }, "code");
      appliedVersion = useEditor.getState().version;
    };

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: toYaml(initial),
        extensions: [
          basicSetup,
          yaml(),
          yamlLanguage.data.of({ autocomplete: completeResumeYaml }),
          lintGutter(),
          syntaxHighlighting(highlight),
          theme,
          EditorView.lineWrapping,
          EditorView.contentAttributes.of({ "aria-label": "Resume as YAML" }),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged || update.transactions.some((t) => t.annotation(regenerated))) return;
            lastTypedAt = Date.now();
            setStatus({ kind: "checking" });
            clearTimeout(timer);
            timer = setTimeout(() => apply(update.view), APPLY_DELAY_MS);
          }),
        ],
      }),
    });
    viewRef.current = view;

    // Changes from elsewhere (forms, Design tab, undo/redo) flow back into the text.
    const unsubscribe = useEditor.subscribe((s, prev) => {
      if (s.version === prev.version || !s.doc || s.version === appliedVersion) return;
      if (invalid) return; // keep the user's unfinished text; "Reset" reloads it
      if (view.hasFocus && Date.now() - lastTypedAt < TYPING_GRACE_MS) return;
      const text = toYaml(s.doc);
      if (text === view.state.doc.toString()) return;
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, annotations: regenerated.of(true) });
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  const reset = () => {
    const view = viewRef.current;
    const doc = useEditor.getState().doc;
    if (!view || !doc) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: toYaml(doc) }, annotations: regenerated.of(true) });
    view.dispatch(setDiagnostics(view.state, []));
    setStatus({ kind: "valid", warnings: [] });
  };

  const copy = async () => {
    const text = viewRef.current?.state.doc.toString();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: nothing to do
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.bar}>
        <span className={styles.status} data-status={status.kind} role="status">
          {status.kind === "valid" && (
            <>
              <Icon name="check" size="xs" /> Valid
              {status.warnings.length > 0 && ` · ${status.warnings.length === 1 ? "1 ignored key" : `${status.warnings.length} ignored keys`}`}
            </>
          )}
          {status.kind === "checking" && "Checking…"}
          {status.kind === "invalid" && (
            <>
              <Icon name="alert" size="xs" /> {status.errors.length === 1 ? "1 error" : `${status.errors.length} errors`}
            </>
          )}
        </span>
        <div className={styles.actions}>
          <Button size="sm" variant="ghost" onClick={copy}>
            <Icon name="copy" /> {copied ? "Copied" : "Copy"}
          </Button>
          <Button size="sm" variant="ghost" onClick={reset} title="Discard edits that aren't applied yet and reload from the resume">
            <Icon name="undo" /> Reset
          </Button>
        </div>
      </div>
      <div ref={hostRef} className={styles.editor} />
      {status.kind === "invalid" && (
        <ul className={styles.errors} aria-label="YAML errors">
          {status.errors.slice(0, 5).map((e, i) => (
            <li key={i}>
              <strong>Line {e.line}:</strong> {e.message}
            </li>
          ))}
          {status.errors.length > 5 && <li>…and {status.errors.length - 5} more</li>}
        </ul>
      )}
      {status.kind !== "checking" && status.warnings.length > 0 && (
        <ul className={styles.warnings} aria-label="YAML warnings">
          {status.warnings.slice(0, 3).map((w, i) => (
            <li key={i}>
              <strong>Line {w.line}:</strong> {w.message}
            </li>
          ))}
          {status.warnings.length > 3 && <li>…and {status.warnings.length - 3} more</li>}
        </ul>
      )}
      <p className={styles.hint}>
        Valid changes apply as you type. Invalid YAML never changes your resume. Press <kbd>Ctrl</kbd>+<kbd>Space</kbd> for suggestions.
      </p>
    </div>
  );
}
