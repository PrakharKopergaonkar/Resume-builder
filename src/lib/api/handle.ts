/**
 * The one way to write an API route handler. See "API route standard" in AGENTS.md.
 *
 *   async function getResumeHandler(req: Request, { user, params }: UserContext) { ... }
 *   export const GET = handle(withUser, getResumeHandler);
 *
 * 1. The middleware runs first. It returns either a context to continue with (e.g. `{ user }`) or a Response
 *    that ends the request (e.g. 401), in which case the handler never runs.
 * 2. Route params are awaited once and handed to the handler as plain values.
 * 3. Unexpected errors are logged and answered with a JSON 500.
 */

export type Middleware<C> = (req: Request) => Promise<C | Response>;

/** Dynamic route segments, e.g. `{ id }` for `/api/resumes/[id]` (empty for routes without any). */
export type Params = Record<string, string>;

/** What a handler receives: the middleware's context plus the route params. */
export type HandlerContext<C> = C & { params: Params };

/** A route handler for a given middleware context. */
export type Handler<C> = (req: Request, ctx: HandlerContext<C>) => Promise<Response>;

export function handle<C extends object>(
  middleware: Middleware<C>,
  handler: Handler<C>,
) {
  return async (req: Request, routeCtx: { params: Promise<Params> }): Promise<Response> => {
    try {
      const result = await middleware(req);
      if (result instanceof Response) return result;
      const params = (await routeCtx?.params) ?? {};
      return await handler(req, { ...result, params });
    } catch (err) {
      console.error(`[api] ${req.method} ${new URL(req.url).pathname} failed:`, err);
      return Response.json({ error: "Something went wrong" }, { status: 500 });
    }
  };
}

export const unauthorized = () => Response.json({ error: "Not signed in" }, { status: 401 });
export const notFound = () => Response.json({ error: "Resume not found" }, { status: 404 });
