import { describe, expect, it } from "vitest";
import { buildPrePrintChecklist, checklistHasWarnings } from "./pre-print-checklist";
import type { Order } from "./types";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    orderId: "ZB001",
    customer: "Rahna Safthar",
    address: "12 Main Road",
    pin: "SW1A 2AA",
    mobile: "+44 7700 900123",
    book: "Hirayil ninnu hridayathilek",
    qty: 1,
    amount: 260,
    post: "India Post",
    payment: "Prepaid",
    tracking: "ZB994627555IN",
    sheetRow: 12,
    trackingSyncStatus: "synced",
    ...overrides,
  };
}

describe("pre-print checklist", () => {
  it("flags missing recipient name, address, postal code, and contact number", () => {
    const [check] = buildPrePrintChecklist([order({ customer: " ", address: "", pin: "", mobile: "" })]);
    expect(check?.missingRecipientDetails).toEqual(["Customer name", "Address", "PIN / postal code", "Contact number"]);
  });

  it("rejects a tracking code that does not match the supplied barcode format", () => {
    const [check] = buildPrePrintChecklist([order({ tracking: "ZB123IN" })]);
    expect(check?.validTrackingNumber).toBe(false);
  });

  it("flags a sheet-linked tracking number whose write failed", () => {
    const [check] = buildPrePrintChecklist([order({ trackingSyncStatus: "failed" })]);
    expect(check?.syncStatus).toBe("failed");
    expect(check && checklistHasWarnings([check])).toBe(true);
  });

  it("does not claim a local-only order needs Google Sheets sync", () => {
    const [check] = buildPrePrintChecklist([order({ sheetRow: undefined, trackingSyncStatus: "not_applicable" })]);
    expect(check?.syncStatus).toBe("not_applicable");
    expect(check && checklistHasWarnings([check])).toBe(false);
  });
});