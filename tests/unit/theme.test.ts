import { describe, expect, it } from "vitest";
import { DARK_QUERY, resolveTheme, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "@/lib/theme-shared";

describe("resolveTheme", () => {
  it("uses a stored choice over the OS setting", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the OS when nothing valid is stored", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(undefined, false)).toBe("light");
    expect(resolveTheme("purple", true)).toBe("dark");
    expect(resolveTheme("", false)).toBe("light");
  });
});

/** Runs the inline <head> script against a fake browser and returns the data-theme it set. */
function runInitScript(opts: { stored?: string | null; storageThrows?: boolean; systemDark?: boolean; path?: string; noMatchMedia?: boolean }) {
  const attrs: Record<string, string> = {};
  const win: Record<string, unknown> = {};
  if (!opts.noMatchMedia) {
    win.matchMedia = (q: string) => {
      expect(q).toBe(DARK_QUERY);
      return { matches: Boolean(opts.systemDark) };
    };
  }
  const fakeWindow = Object.assign(win, {
    localStorage: {
      getItem(key: string) {
        expect(key).toBe(THEME_STORAGE_KEY);
        if (opts.storageThrows) throw new Error("blocked");
        return opts.stored ?? null;
      },
    },
    location: { pathname: opts.path ?? "/" },
    document: { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
  });
  new Function("window", "localStorage", "location", "document", "matchMedia", THEME_INIT_SCRIPT)(
    fakeWindow,
    fakeWindow.localStorage,
    fakeWindow.location,
    fakeWindow.document,
    win.matchMedia,
  );
  return attrs["data-theme"];
}

describe("THEME_INIT_SCRIPT", () => {
  it("applies a stored theme", () => {
    expect(runInitScript({ stored: "dark", systemDark: false })).toBe("dark");
    expect(runInitScript({ stored: "light", systemDark: true })).toBe("light");
  });

  it("falls back to the OS setting", () => {
    expect(runInitScript({ systemDark: true })).toBe("dark");
    expect(runInitScript({ systemDark: false })).toBe("light");
    expect(runInitScript({ stored: "nonsense", systemDark: true })).toBe("dark");
  });

  it("survives blocked storage and a missing matchMedia", () => {
    expect(runInitScript({ storageThrows: true, systemDark: true })).toBe("dark");
    expect(runInitScript({ noMatchMedia: true })).toBe("light");
  });

  it("always uses light on print pages", () => {
    expect(runInitScript({ stored: "dark", systemDark: true, path: "/print/abc" })).toBe("light");
    expect(runInitScript({ stored: "dark", path: "/resume/abc" })).toBe("dark");
  });
});
