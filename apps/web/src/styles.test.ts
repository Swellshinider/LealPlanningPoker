import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

describe("reaction styling", () => {
  it("centers player heads consistently even when they are wrapped in reaction triggers", () => {
    expect(styles).toContain(".player-seat__head {");
    expect(styles).toContain("left: 50%;");
    expect(styles).toContain("transform: translateX(-50%);");
  });

  it("styles the reaction popover for dark theme", () => {
    expect(styles).toContain(':root[data-theme="dark"] .reaction-popover');
    expect(styles).toContain(':root[data-theme="dark"] .reaction-popover__emoji');
  });
});
