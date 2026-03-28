import { describe, it, expect, vi } from "vitest";

vi.mock("next/og", () => ({
  ImageResponse: class MockImageResponse {
    element: unknown;
    options: unknown;
    constructor(element: unknown, options: unknown) {
      this.element = element;
      this.options = options;
    }
  },
}));

import Image, { runtime, alt, size, contentType } from "@/app/opengraph-image";

describe("opengraph-image", () => {
  it("exports correct metadata", () => {
    expect(runtime).toBe("edge");
    expect(alt).toBe("FlappyBoards — Retro split-flap display emulator");
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("returns an ImageResponse", async () => {
    const result = await Image();
    expect(result).toBeDefined();
    expect(result).toHaveProperty("element");
    expect(result).toHaveProperty("options");
  });
});
