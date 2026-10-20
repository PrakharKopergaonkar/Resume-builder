import { describe, expect, it } from "vitest";
import {
  clampLeftWidth,
  DEFAULT_LEFT_WIDTH,
  MAX_LEFT_WIDTH,
  MIN_LEFT_WIDTH,
  MIN_PREVIEW_WIDTH,
} from "@/lib/panel-width";

describe("clampLeftWidth", () => {
  it("keeps widths inside the limits on a wide window", () => {
    expect(clampLeftWidth(500, 2000)).toBe(500);
    expect(clampLeftWidth(50, 2000)).toBe(MIN_LEFT_WIDTH);
    expect(clampLeftWidth(5000, 2000)).toBe(MAX_LEFT_WIDTH);
  });

  it("leaves the preview at least its minimum width on narrower windows", () => {
    const available = 900;
    expect(clampLeftWidth(800, available)).toBe(available - MIN_PREVIEW_WIDTH);
  });

  it("falls back to the minimum when the window is too narrow for both panels", () => {
    expect(clampLeftWidth(500, 600)).toBe(MIN_LEFT_WIDTH);
  });

  it("rounds, and replaces invalid widths with the default", () => {
    expect(clampLeftWidth(400.6, 2000)).toBe(401);
    expect(clampLeftWidth(NaN, 2000)).toBe(DEFAULT_LEFT_WIDTH);
  });
});
