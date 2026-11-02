import { describe, expect, it } from "vitest";
import { amountText, orderTotals, payableText } from "./types";

describe("label price summary", () => {
  it("prepaid is ₹290 with free delivery", () => {
    const t = orderTotals({ amount: 290, payment: "Prepaid" });
    expect(t.total).toBe(290);
    expect(t.payable).toBe(290);
    expect(amountText({ amount: 290, payment: "Prepaid" })).toBe("₹290 · Free delivery");
    expect(payableText({ amount: 290, payment: "Prepaid" })).toBe("Total payable: ₹290");
  });

  it("cod is ₹295 plus a rounded 2% handling charge", () => {
    const t = orderTotals({ amount: 295, payment: "COD" });
    expect(t.codCharge).toBe(6); // 2% of 295 = 5.90, rounded to 6
    expect(t.payable).toBe(301);
    expect(amountText({ amount: 295, payment: "COD" })).toBe("₹295 · Free delivery");
    expect(payableText({ amount: 295, payment: "COD" })).toBe(
      "Total payable: ₹301 (incl. ₹6 COD charge)",
    );
  });
});
