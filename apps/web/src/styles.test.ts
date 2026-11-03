import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styleIndex = readFileSync(new URL("./styles/index.css", import.meta.url), "utf8");
const pokerTableStyles = readFileSync(new URL("./styles/poker-table.css", import.meta.url), "utf8");
const publicStyles = readFileSync(new URL("./styles/public.css", import.meta.url), "utf8");

describe("reaction styling", () => {
  it("loads the split stylesheet entrypoint in a stable order", () => {
    expect(styleIndex).toContain('@import "./theme.css";');
    expect(styleIndex).toContain('@import "./base.css";');
    expect(styleIndex).toContain('@import "./poker-table.css";');
  });

  it("centers player heads consistently even when they are wrapped in reaction triggers", () => {
    expect(pokerTableStyles).toContain(".player-seat__head {");
    expect(pokerTableStyles).toContain("left: 50%;");
    expect(pokerTableStyles).toContain("transform: translateX(-50%);");
  });

  it("styles the reaction popover for dark theme", () => {
    expect(pokerTableStyles).toContain(':root[data-theme="dark"] .reaction-popover');
    expect(pokerTableStyles).toContain(':root[data-theme="dark"] .reaction-popover__emoji');
  });

  it("keeps seat popovers off the card and the board for each seat placement", () => {
    expect(pokerTableStyles).toContain(".table-seat--side {");
    expect(pokerTableStyles).toContain("--reaction-popover-bottom: calc(100% + 6px);");
    expect(pokerTableStyles).toContain(".table-seat--corner.table-seat--inward-right {");
    expect(pokerTableStyles).toContain("--reaction-popover-right: calc(100% + 6px);");
    expect(pokerTableStyles).toContain(".table-seat--center {");
    expect(pokerTableStyles).toContain("--host-action-right: calc(50% + 46px);");
  });

  it("places corner and side cards next to the avatar toward the table centre", () => {
    expect(pokerTableStyles).toContain(".table-seat--inward-right .table-card-slot {");
    expect(pokerTableStyles).toContain(".table-seat--inward-left .table-card-slot {");
  });

  it("keeps ring-seat host actions visible inside the card on narrow layouts", () => {
    expect(pokerTableStyles).toContain(".table-seat--ring .player-seat__host-action--hover,");
    expect(pokerTableStyles).toContain(".table-seat--ring .player-seat__host-action--open {");
  });

  it("hides transfer host while the reaction popover is open on the same seat", () => {
    expect(pokerTableStyles).toContain(".player-seat__host-action--suppressed,");
    expect(pokerTableStyles).toContain(".table-seat:hover .player-seat__host-action--suppressed,");
  });

  it("keeps public-page footers pinned after the main content track", () => {
    expect(publicStyles).toContain(".public-page {");
    expect(publicStyles).toContain("grid-template-rows: auto 1fr auto;");
  });
});
