# Resume Builder (local MVP)

A local-only resume builder modeled on Zety's dashboard and editor. You can create, edit, design and download resumes as PDFs. Everything runs on your machine, and data lives in a SQLite file in `data/`.

See [`../PLAN.md`](../PLAN.md) for the research and design behind it.

## Setup

Requires Node 20+.

```bash
npm install          # also runs `prisma generate`
npm run setup        # creates data/resumes.db and seeds a sample resume
npm run dev          # http://localhost:3000
```

`npm install` downloads a Chromium build for Puppeteer (~170 MB), which is used for PDF export. npm's `allowScripts` in `package.json` lists the packages that are allowed to run install scripts.

## What it does

- **Dashboard (`/`)**
  - List and grid (thumbnail) views, sorted by last modified.
  - Create, Edit, Download PDF, Print, Duplicate, Rename and Delete.
- **Editor (`/resume/[id]`)**
  - Section forms on the left and a live preview on the right. Click any part of the preview to open its form.
  - Drag to reorder sections and entries, hide or delete sections, and add preset or custom sections.
  - Rich text with bold, italic and lists.
  - Autosave about 800 ms after you stop typing.
  - Undo and redo (⌘Z / ⇧⌘Z when focus is outside a text field).
  - Zoom and page-break guides in the preview.
  - Drag the divider between the form panel and the preview to resize them (320–720 px; the preview keeps at least 420 px). Arrow keys also work on the divider, double-click resets, and the width is remembered per browser.
- **Design:** three templates (Classic, Modern, Sidebar), accent color, font, font size, section and line spacing, A4 or US Letter, and left/right column choice for the Sidebar template.
- **PDF:** `GET /api/resumes/:id/pdf`. Headless Chrome prints `/print/[id]`, which uses the same `<ResumeRenderer>` as the preview, so the PDF matches what you see.

## Layout

```
prisma/                 schema, migrations, seed
src/app/                pages (dashboard, editor, print) + /api/resumes route handlers
src/components/renderer ResumeRenderer, templates, renderer.css (plain CSS, shared by preview/PDF/thumbnails)
src/components/editor   editor shell, forms, design + add-section panels, preview
src/components/dashboard
src/store/              Zustand editor store (undo/redo) + autosave hook
src/lib/                prisma client, data access, Puppeteer rendering, paper sizes, API client
src/types/resume.ts     types + zod schemas
src/styles/_tokens.scss shared Sass tokens (colors, radii, shadows) and mixins for the *.module.scss files
tests/unit              vitest
tests/e2e               playwright
```

## Scripts

| Script | |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run setup` | generate the client, apply migrations, seed |
| `npm run db:migrate` | create or apply a migration after editing `schema.prisma` |
| `npm run typecheck` / `lint` | checks |
| `npm test` | unit tests |
| `npm run test:e2e` | end-to-end test. It starts `npm run dev` itself; if a dev server is already running, use `PLAYWRIGHT_BASE_URL=http://localhost:<port> npm run test:e2e` instead, because Next allows only one `next dev` per folder. Run `npx playwright install chromium` once beforehand. |

## Notes

- The first PDF after a server start takes a few seconds while Chrome launches. Later ones reuse the browser and take about 1–2 s.
- Thumbnails are cached in `data/thumbnails/` and re-rendered when a resume changes.
- Rich text is sanitized on save to `p, br, strong/b, em/i, u, ul, ol, li`.

## Theme

The sun/moon button in the header (dashboard and editor) switches between light and dark. A first visit follows your OS setting; once you click the button, your choice is remembered in the browser (`localStorage`, key `resume-builder:theme`). The resume paper stays white in both themes, and the print page, PDFs and thumbnails are always light.

How it works:
- `<html data-theme="light|dark">` selects a set of CSS custom properties defined in `src/styles/themes.scss`.
- An inline script in `<head>` (`THEME_INIT_SCRIPT` in `src/lib/theme-shared.ts`) sets the attribute before the first paint, so there is no flash of the wrong theme.
- `src/styles/_tokens.scss` exposes the colors to the `*.module.scss` files as Sass variables that resolve to `var(--…)`, so component styles work in both themes unchanged. Use the role tokens (`$surface`, `$accent-text`, `$danger-text`, …) rather than raw shades where a color has a specific job, and `$white` only for things that must stay white.
- To tune the dark palette, edit the `[data-theme="dark"]` block in `themes.scss`.

## Styling

Every component or page has its own `<Name>.module.scss` next to it (for example `Dashboard.tsx` and `Dashboard.module.scss`), imported as `styles` and applied with `className={styles.something}`. Use `cx()` from `src/lib/cx.ts` to combine classes conditionally. Colors, radii and shadows come from `src/styles/_tokens.scss`:

```scss
@use "../../styles/tokens" as *;   // path is relative to the module file
```

The resume itself (`src/components/renderer/renderer.css`) stays plain, global CSS on purpose: the preview, PDF and thumbnails all depend on its stable class names. `src/app/globals.css` is the only file that still goes through Tailwind (for its base reset); no component uses Tailwind utility classes.

