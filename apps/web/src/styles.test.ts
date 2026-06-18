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

  it("repositions seat popovers inward for each table edge", () => {
    expect(styles).toContain(".table-seat--upper {");
    expect(styles).toContain("--reaction-popover-top: calc(100% + 6px);");
    expect(styles).toContain(".table-seat--lower {");
    expect(styles).toContain("--reaction-popover-bottom: calc(100% + 6px);");
    expect(styles).toContain(".table-seat--right {");
    expect(styles).toContain("--reaction-popover-right: calc(100% + 6px);");
  });

  it("keeps ring-seat host actions visible inside the card on narrow layouts", () => {
    expect(styles).toContain(".table-seat--ring .player-seat__host-action--hover,");
    expect(styles).toContain(".table-seat--ring .player-seat__host-action--open {");
  });

  it("hides transfer host while the reaction popover is open on the same seat", () => {
    expect(styles).toContain(".player-seat__host-action--suppressed,");
    expect(styles).toContain(".table-seat:hover .player-seat__host-action--suppressed,");
  });

  it("keeps public-page footers pinned after the main content track", () => {
    expect(styles).toContain(".public-page__main {");
    expect(styles).toContain("grid-template-rows: auto 1fr auto;");
  });
});
