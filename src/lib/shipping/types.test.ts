import { describe, expect, it } from "vitest";
import { amountText, codAmountText, INDIA_POST_CUSTOMER_ID, orderTotals, payableText } from "./types";

describe("label customer ID and COD amount", () => {
  it("uses the fixed India Post customer ID 1962802527", () => {
    expect(INDIA_POST_CUSTOMER_ID).toBe("1962802527");
  });

  it("COD amount is the total payable including the 2% charge", () => {
    expect(codAmountText({ amount: 295, payment: "COD" })).toBe("Rs. 301");
    expect(codAmountText({ amount: 1210, payment: "COD" })).toBe("Rs. 1234");
  });
});


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
