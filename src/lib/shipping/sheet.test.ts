import { describe, expect, it } from "vitest";
import { isIndiaPostConsignmentNumber, isPendingPrepaid, parseSheetAmount, stageOf, statusWriteValue, type SheetRow } from "./sheet";

function row(partial: Partial<SheetRow>): SheetRow {
  return {
    key: "k", customer: "", address: "", pin: "", contact: "", whatsapp: "",
    books: "", qty: 1, amount: 0, payment: null, cod: false,
    payStatus: "", dispatchStatus: "", deliveryStatus: "",
    tracking: "", sheetRow: 2, ...partial,
  };
}

describe("stageOf", () => {
  it("marks COD orders as the payment stage automatically", () => {
    expect(stageOf(row({ cod: true, payStatus: "COD", payment: "COD" }))).toBe("payment");
  });

  it("keeps a COD order already dispatched beyond the payment stage", () => {
    expect(stageOf(row({ cod: true, dispatchStatus: "Dispatched" }))).toBe("dispatch");
  });

  it("keeps COD orders delivered in the feedback stage", () => {
    expect(stageOf(row({ cod: true, deliveryStatus: "Delivered" }))).toBe("feedback");
  });

  it("leaves prepaid orders with no statuses in the order stage", () => {
    expect(stageOf(row({ cod: false }))).toBe("order");
  });

  it("marks prepaid orders with a received payment status as paid", () => {
    expect(stageOf(row({ cod: false, payStatus: "Payment Received" }))).toBe("payment");
  });
});

describe("isPendingPrepaid", () => {
  it("blocks labels for prepaid orders with a pending payment status", () => {
    expect(isPendingPrepaid(row({ cod: false, payStatus: "Payment Pending" }))).toBe(true);
  });

  it("never blocks COD orders, even with pending-style text", () => {
    expect(isPendingPrepaid(row({ cod: true, payStatus: "COD" }))).toBe(false);
  });

  it("allows prepaid orders whose payment has been received", () => {
    expect(isPendingPrepaid(row({ cod: false, payStatus: "Payment Received" }))).toBe(false);
  });
});

describe("parseSheetAmount", () => {
  it("sums a single price written in the books column", () => {
    expect(parseSheetAmount("COMBO 1 💰₹790/-")).toBe(790);
  });

  it("sums multiple book prices", () => {
    expect(parseSheetAmount("ഖലീഫ ഉമർ 💰₹240/-, അലി ഫാത്തിമ 💰₹190/-")).toBe(430);
  });

  it("returns 0 when no price is listed", () => {
    expect(parseSheetAmount("Hirayil ninnu hridayathilek")).toBe(0);
  });
});

describe("statusWriteValue", () => {
  it("writes Payment Received for the payment stage", () => {
    expect(statusWriteValue("payment")).toBe("Payment Received");
  });

  it("writes Dispatched for the dispatch stage", () => {
    expect(statusWriteValue("dispatch")).toBe("Dispatched");
  });

  it("writes Delivered for the delivery stage", () => {
    expect(statusWriteValue("delivery")).toBe("Delivered");
  });
});

describe("consignment barcode validation", () => {
  it("accepts the supplied India Post code format", () => {
    expect(isIndiaPostConsignmentNumber("ZB994627555IN")).toBe(true);
    expect(isIndiaPostConsignmentNumber("ZB994637544IN")).toBe(true);
  });

  it("rejects malformed codes instead of inventing a replacement", () => {
    expect(isIndiaPostConsignmentNumber("ZB123IN")).toBe(false);
  });
});
