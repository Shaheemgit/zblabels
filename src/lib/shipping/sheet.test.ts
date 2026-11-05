import { describe, expect, it } from "vitest";
import { isIndiaPostConsignmentNumber, isPendingPrepaid, labelCutoffContactKeys, parseSheetAmount, stageOf, statusWriteValue, unlabeledKeysThrough, type SheetRow } from "./sheet";

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

describe("unlabeledKeysThrough", () => {
  it("marks orders through Arshad's order while excluding pending prepaid orders", () => {
    const rows = [
      row({ key: "later-order", sheetRow: 6 }),
      row({ key: "arshad-order", customer: "Arshad", contact: "8156821938", sheetRow: 5 }),
      row({ key: "cod-pending-order", cod: true, payStatus: "Payment Pending", sheetRow: 4 }),
      row({ key: "pending-order", payStatus: "Payment Pending", sheetRow: 3 }),
      row({ key: "earlier-order", sheetRow: 2 }),
    ];

    expect(unlabeledKeysThrough(rows, "arshad-order", [])).toEqual([
      "earlier-order",
      "cod-pending-order",
      "pending-order",
      "arshad-order",
    ]);
  });

  it("finds the requested contact as a cutoff and excludes every pending-payment row", () => {
    const rows = [
      row({ key: "newer", contact: "5550000000", sheetRow: 8 }),
      row({ key: "arshad", contact: "+91 81568 21938", sheetRow: 5 }),
      row({ key: "pending", payStatus: "Payment Pending", sheetRow: 4 }),
      row({ key: "earlier", sheetRow: 2 }),
    ];

    expect(labelCutoffContactKeys(rows, "8156821938", [])).toEqual(["earlier", "arshad"]);
    expect(labelCutoffContactKeys(rows, "0000000000", [])).toEqual(["newer"]);
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
