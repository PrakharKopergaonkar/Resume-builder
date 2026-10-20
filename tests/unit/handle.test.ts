import { describe, expect, it, vi } from "vitest";
import { handle, notFound, type Middleware } from "@/lib/api/handle";

const req = (path = "/api/things/1", method = "GET") => new Request(`http://localhost${path}`, { method });
const route = (params: Record<string, string> = {}) => ({ params: Promise.resolve(params) });

describe("handle()", () => {
  it("stops at the middleware when it answers with a Response", async () => {
    const handler = vi.fn(async () => new Response("should not run"));
    const deny: Middleware<{ user: string }> = async () => Response.json({ error: "Not signed in" }, { status: 401 });
    const res = await handle(deny, handler)(req(), route());
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it("passes the middleware's context and the awaited params to the handler", async () => {
    const allow: Middleware<{ user: { id: string } }> = async () => ({ user: { id: "u1" } });
    const res = await handle(allow, async (_r, { user, params }) => Response.json({ user: user.id, id: params.id }))(req(), route({ id: "r9" }));
    expect(await res.json()).toEqual({ user: "u1", id: "r9" });
  });

  it("works for routes without params", async () => {
    const res = await handle(async () => ({}), async (_r, { params }) => Response.json(params))(req("/api/x"), undefined as never);
    expect(await res.json()).toEqual({});
  });

  it("turns unexpected errors into a JSON 500 and logs them", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handle(async () => ({}), async () => {
      throw new Error("boom");
    })(req("/api/x", "POST"), route());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Something went wrong" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("POST /api/x"), expect.any(Error));
    log.mockRestore();
  });

  it("also catches errors thrown by the middleware", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handle(async () => {
      throw new Error("db down");
    }, async () => new Response("unreachable"))(req(), route());
    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });

  it("returns handler responses unchanged", async () => {
    const res = await handle(async () => ({}), async () => notFound())(req(), route());
    expect(res.status).toBe(404);
  });
});
