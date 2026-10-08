import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import type { Order } from "@/lib/shipping/types";
import { DEFAULT_BOOK, DEFAULT_POST, commitOrderSeq, formatOrderId, peekOrderSeq } from "@/lib/shipping/storage";

const SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/1sJYQWIp-penJYTU9mGLRGe9bVIEHnRYhP0hmrPTS09I/gviz/tq?tqx=out:csv&gid=2082984115";
const IMPORTED_KEY = "zawiya.sheetImported";

type Row = { key: string; customer: string; address: string; pin: string; mobile: string; qty: number; payment: "Prepaid" | "COD" };

function parseCsv(text: string): string[][] {
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

function loadImported(): string[] {
  try { return JSON.parse(localStorage.getItem(IMPORTED_KEY) || "[]"); } catch { return []; }
}

export function SheetImport({ onAdd, onDone }: { onAdd: (o: Omit<Order, "id">) => void; onDone: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchRows() {
    setLoading(true);
    try {
      const res = await fetch(`${SHEET_CSV}&t=${Date.now()}`);
      if (!res.ok) throw new Error();
      const [head = [], ...body] = parseCsv(await res.text());
      const col = (word: string) => head.findIndex((h) => h.toLowerCase().includes(word));
      // Only the "Contact number" column is used — never "Whatsapp number".
      const phone = col("contact number") >= 0 ? col("contact number") : col("contact");
      const ix = { t: col("timestamp"), n: col("name"), a: col("adress") >= 0 ? col("adress") : col("address"), p: col("pin"), m: phone, q: col("quantity"), pay: col("payment option"), st: col("payment status") };
      const done = loadImported();
      const payOf = (r: string[]): "COD" | "Prepaid" | null => {
        const s = (r[ix.st] ?? "").toLowerCase();
        const p = (r[ix.pay] ?? "").toLowerCase();
        if (/pending/.test(s)) return null;
        if (/\bcod\b|cash/.test(s) || /cash on delivery|\bcod\b/.test(p)) return "COD";
        if (/rec(ei|ie)ved/.test(s) || /upi|gpay|paytm|phonepay/.test(p)) return "Prepaid";
        return null;
      };
      const parsed = body
        .filter((r) => r.some((c) => c.trim()))
        .filter((r) => payOf(r) !== null)
        .map((r) => ({
          key: `${r[ix.t] ?? ""}|${r[ix.m] ?? ""}`,
          customer: (r[ix.n] ?? "").trim(),
          address: (r[ix.a] ?? "").trim(),
          pin: (r[ix.p] ?? "").trim(),
          mobile: (r[ix.m] ?? "").trim(),
          qty: Number.parseInt(r[ix.q] ?? "1", 10) || 1,
          payment: payOf(r) ?? ("Prepaid" as const),
        }))
        .filter((r) => !done.includes(r.key));
      setRows(parsed);
      setPicked(parsed.map((r) => r.key));
      if (parsed.length === 0) toast.success("No new orders in the sheet");
    } catch {
      toast.error("Could not read the Google Sheet. Make sure it is shared as 'Anyone with the link'.");
    } finally {
      setLoading(false);
    }
  }

  function importPicked() {
    if (!rows) return;
    let seq = peekOrderSeq();
    const chosen = rows.filter((r) => picked.includes(r.key));
    for (const r of chosen) {
      onAdd({
        orderId: formatOrderId(seq), customer: r.customer, address: r.address, pin: r.pin,
        mobile: r.mobile, book: DEFAULT_BOOK, post: DEFAULT_POST, payment: r.payment, qty: r.qty, amount: 260 * r.qty,
      });
      commitOrderSeq(seq);
      seq++;
    }
    localStorage.setItem(IMPORTED_KEY, JSON.stringify([...loadImported(), ...chosen.map((r) => r.key)]));
    setRows(rows.filter((r) => !picked.includes(r.key)));
    setPicked([]);
    onDone();
    toast.success(`${chosen.length} order${chosen.length === 1 ? "" : "s"} imported`);
  }

  return (
    <div className="space-y-3">
      <Button variant="outline" className="h-12 w-full" onClick={fetchRows} disabled={loading}>
        {loading ? "Loading…" : "Load new orders from Google Sheet"}
      </Button>
      {rows && rows.length > 0 && (
        <>
          <div className="space-y-2">
            {rows.map((r) => (
              <label key={r.key} className="flex gap-3 rounded-md border p-3 text-sm">
                <Checkbox
                  checked={picked.includes(r.key)}
                  onCheckedChange={(c) => setPicked((p) => (c ? [...p, r.key] : p.filter((k) => k !== r.key)))}
                />
                <div className="min-w-0">
                  <div className="font-medium">{r.customer || "No name"} · {r.payment} · Qty {r.qty}</div>
                  <div className="truncate text-muted-foreground">{r.address}</div>
                  <div className="text-muted-foreground">PIN {r.pin || "missing"} · {r.mobile}</div>
                </div>
              </label>
            ))}
          </div>
          <Button className="h-12 w-full" onClick={importPicked} disabled={picked.length === 0}>
            Add {picked.length} selected order{picked.length === 1 ? "" : "s"}
          </Button>
        </>
      )}
    </div>
  );
}
