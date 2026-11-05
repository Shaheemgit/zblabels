import { describe, expect, it } from "vitest";
import { BARCODE_LABELS_START_AT, labelBatchSupportsBarcodes } from "./storage";

describe("barcode cutoff for generated label history", () => {
  it("keeps labels generated earlier on November 5, 2026 barcode-free", () => {
    expect(labelBatchSupportsBarcodes("2026-11-05T14:39:29.999Z")).toBe(false);
  });

  it("allows barcodes for labels generated from the cutoff onward", () => {
    expect(labelBatchSupportsBarcodes(BARCODE_LABELS_START_AT)).toBe(true);
    expect(labelBatchSupportsBarcodes("2026-11-05T14:39:30.001Z")).toBe(true);
  });

  it("does not show barcodes for invalid legacy timestamps", () => {
    expect(labelBatchSupportsBarcodes("not-a-date")).toBe(false);
  });
});