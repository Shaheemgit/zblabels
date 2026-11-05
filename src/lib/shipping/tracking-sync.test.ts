import { describe, expect, it } from "vitest";
import { canRetryTrackingWrite } from "./tracking-sync";

describe("tracking write retry eligibility", () => {
  it("allows retry for a failed sheet-linked order with its assigned tracking number", () => {
    expect(canRetryTrackingWrite({ tracking: "ZB994627555IN", sheetRow: 12, trackingSyncStatus: "failed" })).toBe(true);
  });

  it("does not allow retry for a synced order", () => {
    expect(canRetryTrackingWrite({ tracking: "ZB994627555IN", sheetRow: 12, trackingSyncStatus: "synced" })).toBe(false);
  });

  it("does not allow retry without a source sheet row", () => {
    expect(canRetryTrackingWrite({ tracking: "ZB994627555IN", trackingSyncStatus: "failed" })).toBe(false);
  });

  it("does not allow retry without the already assigned tracking number", () => {
    expect(canRetryTrackingWrite({ sheetRow: 12, trackingSyncStatus: "failed" })).toBe(false);
  });
});