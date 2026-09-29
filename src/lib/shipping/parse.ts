import type { Order } from "./types";

export type ParsedRow = {
  key: string;
  order: Omit<Order, "id">;
  errors: string[];
};

function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  // Fall back to commas, honouring simple "quoted, values"
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === "," && !quoted) {
      out.push(current);
      current = "";
    } else current += ch;
  }
  out.push(current);
  return out;
}

const HEADER_HINTS = ["order id", "orderid", "order_id"];

export function parseOrders(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const rows: ParsedRow[] = [];

  lines.forEach((line, index) => {
    const cells = splitRow(line).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (index === 0 && HEADER_HINTS.some((h) => cells[0]?.toLowerCase() === h)) return;

    const [orderId = "", customer = "", address = "", pin = "", mobile = "", book = "", qtyRaw = "", amountRaw = ""] =
      cells;

    const qty = Number.parseInt(qtyRaw.replace(/[^\d]/g, ""), 10);
    const amount = Number.parseFloat(amountRaw.replace(/[^\d.]/g, ""));

    const errors: string[] = [];
    if (!orderId) errors.push("Order ID is required");
    if (!customer) errors.push("Customer name is required");
    if (!address) errors.push("Address is required");
    if (!/^\d{6}$/.test(pin)) errors.push(pin ? "PIN code must be 6 digits" : "PIN code is required");

    rows.push({
      key: `${index}-${orderId || "row"}`,
      order: {
        orderId,
        customer,
        address,
        pin,
        mobile,
        book,
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        amount: Number.isFinite(amount) ? amount : 0,
        post: "",
        payment: "Prepaid",
      },
      errors,
    });
  });

  return rows;
}
