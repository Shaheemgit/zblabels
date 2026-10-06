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

export const PRICE_TOTAL = { Prepaid: 290, COD: 295 } as const;

export function orderTotals(o: Pick<Order, "amount" | "payment">) {
  const total = PRICE_TOTAL[o.payment] ?? o.amount;
  return { book: total, delivery: 0, total };
}

export function amountText(o: Pick<Order, "amount" | "payment">, rupee = "₹") {
  const t = orderTotals(o);
  return `${rupee}${t.total} · Free delivery`;
}
