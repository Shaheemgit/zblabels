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
  name: "",
  address1: "",
  address2: "",
  place: "",
  postOffice: "",
  district: "",
  state: "",
  pin: "",
  mobile: "",
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
  tracking: string;
  service: string;
};

export const SERVICES = [
  "Speed Post",
  "India Post Parcel",
  "Book Post",
  "Registered Post",
  "Other",
] as const;

export type OrderStatus = "Ready" | "Tracking Added" | "Label Ready";

export function statusOf(order: Order): OrderStatus {
  if (!order.tracking.trim()) return "Ready";
  if (order.service) return "Label Ready";
  return "Tracking Added";
}

export function senderIsComplete(s: Sender): boolean {
  return Boolean(
    s.name.trim() && s.address1.trim() && s.place.trim() && s.pin.trim() && s.mobile.trim(),
  );
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
