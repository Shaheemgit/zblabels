export type Sender = {
  name: string;
  address1: string;
  address2: string;
  place: string;
  postOffice: string;
  district: string;
  state: string;
  pin: string;
  mobile: string;
};

export const emptySender: Sender = {
  name: "Zawiya books",
  address1: "Edarikkode PO",
  address2: "",
  place: "Malappuram",
  postOffice: "",
  district: "",
  state: "Keralam",
  pin: "676501",
  mobile: "+91 8301 941 146",
};

export type Order = {
  id: string;
  orderId: string;
  customer: string;
  address: string;
  pin: string;
  mobile: string;
  book: string;
  qty: number;
  amount: number;
  post: string;
  payment: "Prepaid" | "COD";
  tracking?: string | undefined;
  trackingSyncStatus?: "pending" | "synced" | "failed" | "not_applicable" | undefined;
  trackingSyncError?: string | undefined;
  sheetRow?: number | undefined;
  sheetKey?: string | undefined;
};

export function senderIsComplete(s: Sender): boolean {
  return Boolean(s.name.trim() && s.address1.trim() && s.place.trim() && s.pin.trim());
}

export function senderLines(s: Sender): string[] {
  const parts = [
    s.address1,
    s.address2,
    s.place,
    s.postOffice ? `${s.postOffice} (P.O)` : "",
    [s.district, s.state].filter(Boolean).join(", "),
  ];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export const COD_HANDLING_PCT = 0.02;

// The owner's fixed India Post customer ID — the same for every order, printed on all labels.
export const INDIA_POST_CUSTOMER_ID = "1962802527";

export function orderTotals(o: Pick<Order, "amount" | "payment">) {
  // Amount comes from the Google Sheet order (or manual entry) — no fixed preset price.
  const total = o.amount;
  // 2% COD handling charge, rounded like the WhatsApp messages (e.g. ₹295 → ₹6 → ₹301 payable).
  const codCharge = o.payment === "COD" ? Math.round(total * COD_HANDLING_PCT) : 0;
  return { book: total, delivery: 0, total, codCharge, payable: total + codCharge };
}

export function amountText(o: Pick<Order, "amount" | "payment">, rupee = "₹") {
  const t = orderTotals(o);
  return `${rupee}${t.total} · Free delivery`;
}

export function payableText(o: Pick<Order, "amount" | "payment">, rupee = "₹") {
  const t = orderTotals(o);
  return o.payment === "COD" && t.codCharge > 0
    ? `Total payable: ${rupee}${t.payable} (incl. ${rupee}${t.codCharge} COD charge)`
    : `Total payable: ${rupee}${t.payable}`;
}

// COD amount collected on delivery: the total payable including the 2% COD charge.
export function codAmountText(o: Pick<Order, "amount" | "payment">, rupee = "Rs. ") {
  return `${rupee}${orderTotals(o).payable}`;
}
