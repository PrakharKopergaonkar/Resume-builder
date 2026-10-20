<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## API route standard

Every API route handler in `src/app/api/**/route.ts` follows these rules. `tests/unit/api-standard.test.ts` checks the first two.

1. **Write each handler as a named function in the route file, then wrap it in `handle(middleware, handler)`** from `src/lib/api/handle.ts`.
   - Name it after what it does, for example `getResumeHandler` or `downloadPdfHandler`, and give it a one-line doc comment.
   - Type its context with `UserContext` (behind `withUser`) or `PublicContext` (behind `publicRoute`).
   - At the bottom of the file, export one line per method: `export const GET = handle(withUser, getResumeHandler);`.
   - No inline arrow handlers and no `export async function GET`. Keep handlers in the same route file.
   - `handle()` runs the middleware first, awaits the route params (`ctx.params.id`), and turns unexpected errors into a logged JSON 500.
2. **The middleware owns the user check.** Protected routes pass `withUser` (`src/lib/api/middleware.ts`) and read `ctx.user` (and `ctx.sessionToken` when a renderer needs it). Don't call `getCurrentUser()`, `cookies()` or `verifySession()` for auth inside a route handler, and don't re-check the session there.
3. **Public endpoints pass `publicRoute` explicitly.** Use it only for endpoints that must work signed out (sign-up, log-in, log-out). There is no default: every route states its middleware on the export line.
4. **Scope data to the user.** Read and write through the `src/lib/resumes.ts` functions that take `user.id`. A missing resource and someone else's resource both answer `notFound()` (404), never 403, so IDs can't be probed. Signed out answers 401; `withUser` already does that.
5. **Validate input with zod.** Use `schema.safeParse(await req.json().catch(() => null))`, and on failure return `400 { error, issues }`.
6. **Don't catch errors just to return a 500.** `handle()` does that. Catch only errors you turn into a specific answer, such as a unique-email conflict becoming 409.
7. **New cross-cutting checks become middleware.** Write things like rate limiting or roles as a `Middleware` passed to `handle()`, not as code copied into handlers.

```ts
import { handle, notFound } from "@/lib/api/handle";
import { withUser, type UserContext } from "@/lib/api/middleware";
import { getResume } from "@/lib/resumes";

/** Returns one of the user's resumes. */
async function getResumeHandler(_req: Request, { user, params }: UserContext) {
  const doc = await getResume(user.id, params.id);
  return doc ? Response.json(doc) : notFound();
}

export const GET = handle(withUser, getResumeHandler);
```

Page redirects for signed-out visitors live in `src/proxy.ts`. That is a convenience for pages only; API authorization is always `handle()` plus `withUser`.
