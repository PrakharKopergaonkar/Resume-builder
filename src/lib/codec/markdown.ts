import { htmlToBlocks, type InlineRun } from "@/lib/richtext";

/**
 * Rich text <-> a small markdown dialect, for editing in the Code view:
 *   paragraphs (one per line), "- " bullets, "1. " numbered items (2 spaces of indent per nesting level),
 *   **bold**, *italic*, <u>underline</u> and <br> (markdown has no underline; line breaks are rare).
 * Literal "*", "\" and "<" in text are escaped with a backslash.
 */

const escapeText = (t: string) => t.replace(/[\\*<]/g, (c) => `\\${c}`);

function runsToMarkdown(runs: InlineRun[]): string {
  let out = "";
  for (const r of runs) {
    if ("lineBreak" in r) {
      out += "<br>";
      continue;
    }
    // Keep surrounding spaces outside the markers so "**bold** text" round-trips.
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(r.text)!;
    let t = escapeText(m[2]);
    if (!t) {
      out += r.text;
      continue;
    }
    if (r.underline) t = `<u>${t}</u>`;
    if (r.italic) t = `*${t}*`;
    if (r.bold) t = `**${t}**`;
    out += m[1] + t + m[3];
  }
  return out.replace(/\*\*\*\*/g, ""); // adjacent bold runs: "**a****b**" -> "**ab**"
}

export function htmlToMarkdown(html: string): string {
  let instance = 0;
  const blocks = htmlToBlocks(html, () => ++instance);
  const counters = new Map<string, number>();
  return blocks
    .map((b) => {
      const text = runsToMarkdown(b.runs).trim();
      if (!b.list) return text;
      const indent = "  ".repeat(b.list.level);
      if (b.list.kind === "bullet") return `${indent}- ${text}`;
      const key = `${b.list.instance}:${b.list.level}`;
      const n = (counters.get(key) ?? 0) + 1;
      counters.set(key, n);
      return `${indent}${n}. ${text}`;
    })
    .join("\n");
}

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inlineToHtml(md: string): string {
  let html = "";
  const open = { b: false, i: false, u: false };
  const toggle = (k: "b" | "i" | "u", tag: string) => {
    html += open[k] ? `</${tag}>` : `<${tag}>`;
    open[k] = !open[k];
  };
  for (const m of md.matchAll(/\\([\\*<])|\*\*|\*|<u>|<\/u>|<br\s*\/?>|[^\\*<]+|[\\<]/gi)) {
    const tok = m[0];
    if (m[1]) html += escapeHtml(m[1]);
    else if (tok === "**") toggle("b", "strong");
    else if (tok === "*") toggle("i", "em");
    else if (/^<u>$/i.test(tok)) {
      if (!open.u) toggle("u", "u");
    } else if (/^<\/u>$/i.test(tok)) {
      if (open.u) toggle("u", "u");
    }
    else if (/^<br/i.test(tok)) html += "<br>";
    else html += escapeHtml(tok);
  }
  // Close anything left open (an unmatched "**" just ends at the end of the line).
  if (open.u) html += "</u>";
  if (open.i) html += "</em>";
  if (open.b) html += "</strong>";
  return html;
}

type Line = { kind: "p" | "ul" | "ol"; level: number; text: string };

/** Markdown → HTML in the shape the rich-text editor (TipTap) produces: `<ul><li><p>…</p></li></ul>`. */
export function markdownToHtml(md: string): string {
  const lines: Line[] = md
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((l) => l.trim())
    .map((raw) => {
      const indent = raw.match(/^ */)![0].length;
      const level = Math.floor(indent / 2);
      const body = raw.trim();
      const bullet = /^[-*+]\s+(.*)$/.exec(body);
      if (bullet && !body.startsWith("**")) return { kind: "ul", level, text: bullet[1] };
      const num = /^\d+[.)]\s+(.*)$/.exec(body);
      if (num) return { kind: "ol", level, text: num[1] };
      return { kind: "p", level: 0, text: body };
    });

  let html = "";
  const stack: { kind: "ul" | "ol"; level: number }[] = []; // open lists; each has an open <li>
  const closeTo = (level: number) => {
    while (stack.length && stack.at(-1)!.level >= level) html += `</li></${stack.pop()!.kind}>`;
  };
  for (const line of lines) {
    if (line.kind === "p") {
      closeTo(0);
      html += `<p>${inlineToHtml(line.text)}</p>`;
      continue;
    }
    // Leave any deeper lists, then continue the list at this level if it's the same kind.
    while (stack.length && stack.at(-1)!.level > line.level) html += `</li></${stack.pop()!.kind}>`;
    const top = stack.at(-1);
    if (top && top.level === line.level) {
      if (top.kind === line.kind) {
        html += `</li><li><p>${inlineToHtml(line.text)}</p>`;
        continue;
      }
      html += `</li></${stack.pop()!.kind}>`; // bullets <-> numbers at the same level: a new list
    }
    // A deeper level nests inside the current <li>; at most one level deeper than its parent.
    const parent = stack.at(-1);
    const level = parent ? Math.min(line.level, parent.level + 1) : 0;
    stack.push({ kind: line.kind, level });
    html += `<${line.kind}><li><p>${inlineToHtml(line.text)}</p>`;
  }
  closeTo(0);
  return html;
}
