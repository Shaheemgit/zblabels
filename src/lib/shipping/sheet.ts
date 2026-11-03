// Shared Google Sheet reading used by both the label importer and the WhatsApp messaging section.
import type { Stage } from "./whatsapp";

export type SavedSheet = { name: string; id: string; gid?: string | undefined };

// The one order source maintained by the owner — all other sheets are disconnected.
export const ORDER_SHEET: SavedSheet = {
  name: "Book orders",
  id: "1_biaElVDh_qm8z6ZfRKI4BLQUaa_g7Dh-w8Cd9ef-JA",
  gid: "1229129423",
};

export const IMPORTED_KEY = "zawiya.sheetImported";

export type SheetRow = {
  key: string; customer: string; address: string; pin: string; contact: string; whatsapp: string;
  books: string; qty: number; amount: number; payment: "Prepaid" | "COD" | null; cod: boolean;
  payStatus: string; dispatchStatus: string; deliveryStatus: string;
  tracking: string; sheetRow: number;
};

// Value written into the sheet's status column for each managed stage.
export type WriteStage = "payment" | "dispatch" | "delivery";
export function statusWriteValue(stage: WriteStage): string {
  return stage === "payment" ? "Payment Received" : stage === "dispatch" ? "Dispatched" : "Delivered";
}

// Prices are written inside the books column, e.g. "COMBO 1 💰₹790/-" or "ഖലീഫ ഉമർ 💰₹240/-, അലി ഫാത്തിമ 💰₹190/-".
export function parseSheetAmount(books: string): number {
  const matches = books.matchAll(/₹\s*([\d,]+(?:\.\d+)?)/g);
  let total = 0;
  for (const m of matches) total += Number.parseFloat((m[1] ?? "0").replace(/,/g, "")) || 0;
  return Math.round(total);
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function stageOf(r: SheetRow): Stage {
  if (/deliver/i.test(r.deliveryStatus)) return "feedback";
  if (/dispatch/i.test(r.dispatchStatus)) return "dispatch";
  if (/rec(ei|ie)ved/i.test(r.payStatus)) return "payment";
  // COD orders are paid on delivery: the sheet already marks their payment status "COD",
  // so they count as the payment stage without a manual "Mark Paid".
  if (r.cod) return "payment";
  return "order";
}

export async function fetchSheetRows(sheet: SavedSheet): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${sheet.id}/gviz/tq?tqx=out:csv${sheet.gid ? `&gid=${sheet.gid}` : ""}&t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error();
  const text = await res.text();
  if (text.trimStart().startsWith("<")) throw new Error();
  const [head = [], ...body] = parseCsv(text);
  const col = (...words: string[]) => {
    for (const w of words) {
      const i = head.findIndex((h) => h.toLowerCase().includes(w));
      if (i >= 0) return i;
    }
    return -1;
  };
  const ix = {
    t: col("timestamp"), b: col("book"), n: col("name"), a: col("adress", "address"), p: col("pin"),
    w: col("whatsapp number"), c: col("contact number", "contact"), q: col("quantity"),
    pay: col("payment option"), st: col("payment status"), ds: col("dispatch status"), dv: col("delivety status", "delivery status"),
    tr: col("tracking number", "tracking"),
  };
  const g = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
  return body
    .map((r, i) => ({ r, row: i + 2 })) // sheet row 1 is the header
    .filter(({ r }) => r.some((c) => c.trim()))
    .map(({ r, row }) => {
      const s = g(r, ix.st).toLowerCase(), p = g(r, ix.pay).toLowerCase();
      const cod = /cash on delivery|\bcod\b/.test(p) || /\bcod\b|cash/.test(s);
      let payment: SheetRow["payment"] = null;
      if (!/pending/.test(s)) {
        if (cod) payment = "COD";
        else if (/rec(ei|ie)ved/.test(s) || /upi|gpay|paytm|phonepay/.test(p)) payment = "Prepaid";
      }
      return {
        key: `${g(r, ix.t)}|${g(r, ix.w) || g(r, ix.c)}`,
        customer: g(r, ix.n), address: g(r, ix.a), pin: g(r, ix.p),
        contact: g(r, ix.c), whatsapp: g(r, ix.w) || g(r, ix.c), books: g(r, ix.b),
        qty: Number.parseInt(g(r, ix.q) || "1", 10) || 1, payment, cod,
        payStatus: g(r, ix.st), dispatchStatus: g(r, ix.ds), deliveryStatus: g(r, ix.dv),
        amount: parseSheetAmount(g(r, ix.b)),
        tracking: g(r, ix.tr),
        sheetRow: row,
      };
    })
    .reverse();
}
