import { describe, expect, it } from "vitest";
import { stageMessage, waPhone } from "./whatsapp";

describe("stageMessage", () => {
  it("sends a Cash on Delivery confirmation for COD payment stage", () => {
    const msg = stageMessage("payment", { name: "Rahna", books: "COMBO 1 💰₹790/-", cod: true });
    expect(msg).toContain("Cash on Delivery");
    expect(msg).not.toContain("payment has been received");
    expect(msg).toContain("₹806"); // 790 + rounded 2% COD charge
  });

  it("keeps the payment-received message for prepaid orders", () => {
    const msg = stageMessage("payment", { name: "Rahna", books: "Book 💰₹260/-", cod: false });
    expect(msg).toContain("payment has been received successfully");
    expect(msg).not.toContain("Cash on Delivery");
  });
});

describe("waPhone", () => {
  it("prefixes ten-digit numbers with the India code", () => {
    expect(waPhone("9876543210")).toBe("919876543210");
  });

  it("keeps numbers already carrying a country code", () => {
    expect(waPhone("+919876543210")).toBe("919876543210");
  });
});
