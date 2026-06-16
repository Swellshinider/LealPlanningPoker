import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("index.html", () => {
  it("declares the app favicons", () => {
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain('href="/favicons/favicon-light.ico"');
    expect(indexHtml).toContain('href="/favicons/favicon-dark.ico"');
    expect(indexHtml).toContain('media="(prefers-color-scheme: dark)"');
  });
});
