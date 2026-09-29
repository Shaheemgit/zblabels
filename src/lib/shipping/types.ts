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
  state: "",
  pin: "676501",
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
