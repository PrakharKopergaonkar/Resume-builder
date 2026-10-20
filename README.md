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
- **Design:** three templates (Classic, Modern, Sidebar), accent color, font, font size, section and line spacing, A4 or US Letter, and left/right column choice for the Sidebar template.
- **PDF:** `GET /api/resumes/:id/pdf`. Headless Chrome prints `/print/[id]`, which uses the same `<ResumeRenderer>` as the preview, so the PDF matches what you see.

## Layout

```
prisma/                 schema, migrations, seed
src/app/                pages (dashboard, editor, print) + /api/resumes route handlers
src/components/renderer ResumeRenderer, templates, renderer.css (shared by preview/PDF/thumbnails)
src/components/editor   editor shell, forms, design + add-section panels, preview
src/components/dashboard
src/store/              Zustand editor store (undo/redo) + autosave hook
src/lib/                prisma client, data access, Puppeteer rendering, paper sizes, API client
src/types/resume.ts     types + zod schemas
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
