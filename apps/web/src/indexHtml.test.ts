import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("index.html", () => {
  it("declares the app favicon", () => {
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain('href="/favicons/favicon.ico"');
    expect(indexHtml).not.toContain('media="(prefers-color-scheme');
  });
});
