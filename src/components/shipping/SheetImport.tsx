import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Order } from "@/lib/shipping/types";
import { DEFAULT_BOOK, DEFAULT_POST, commitOrderSeq, formatOrderId, peekOrderSeq } from "@/lib/shipping/storage";
import { STAGES, stageMessage, waLink, type Stage } from "@/lib/shipping/whatsapp";

type SavedSheet = { name: string; id: string; gid?: string };
const SHEETS_KEY = "zawiya.sheets";
const ACTIVE_KEY = "zawiya.activeSheet";
const IMPORTED_KEY = "zawiya.sheetImported";
const DEFAULT_SHEETS: SavedSheet[] = [
  { name: "Book orders", id: "1_biaElVDh_qm8z6ZfRKI4BLQUaa_g7Dh-w8Cd9ef-JA" },
  { name: "Old orders", id: "1sJYQWIp-penJYTU9mGLRGe9bVIEHnRYhP0hmrPTS09I", gid: "2082984115" },
];

type Row = {
  key: string; customer: string; address: string; pin: string; contact: string; whatsapp: string;
  books: string; qty: number; payment: "Prepaid" | "COD" | null; cod: boolean;
  payStatus: string; dispatchStatus: string; deliveryStatus: string;
};

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

const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };

export function parseSheetUrl(url: string): { id: string; gid?: string } | null {
  const id = url.match(/\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  if (!id) return null;
  const gid = url.match(/gid=(\d+)/)?.[1];
  return { id, gid };
}

type Filter = "all" | "pending" | "paid" | "dispatched" | "delivered";

export function SheetImport({ onAdd, onDone }: { onAdd: (o: Omit<Order, "id">) => void; onDone: () => void }) {
  const [sheets, setSheets] = useState<SavedSheet[]>(DEFAULT_SHEETS);
  const [active, setActive] = useState(0);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    setSheets(read(SHEETS_KEY, DEFAULT_SHEETS));
    setActive(read(ACTIVE_KEY, 0));
    setDone(read(IMPORTED_KEY, []));
  }, []);

  const sheet = sheets[active] ?? sheets[0];

  function saveSheets(s: SavedSheet[], a: number) {
    setSheets(s); setActive(a); setRows(null);
    localStorage.setItem(SHEETS_KEY, JSON.stringify(s));
    localStorage.setItem(ACTIVE_KEY, JSON.stringify(a));
  }

  function addSheet() {
    const p = parseSheetUrl(newUrl);
    if (!p) return toast.error("Paste a valid Google Sheet link");
    const next = [...sheets, { name: newName.trim() || `Sheet ${sheets.length + 1}`, ...p }];
    saveSheets(next, next.length - 1);
    setNewName(""); setNewUrl(""); setAdding(false);
  }

  function removeSheet() {
    if (sheets.length <= 1) return toast.error("Keep at least one sheet");
    if (!confirm(`Remove "${sheet.name}" from the list?`)) return;
    saveSheets(sheets.filter((_, i) => i !== active), 0);
  }

  async function fetchRows() {
    if (!sheet) return;
    setLoading(true);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${sheet.id}/gviz/tq?tqx=out:csv${sheet.gid ? `&gid=${sheet.gid}` : ""}&t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const text = await res.text();
      if (text.trimStart().startsWith("<")) throw new Error();
      const [head = [], ...body] = parseCsv(text);
      const col = (...words: string[]) => { for (const w of words) { const i = head.findIndex((h) => h.toLowerCase().includes(w)); if (i >= 0) return i; } return -1; };
      const ix = {
        t: col("timestamp"), b: col("book"), n: col("name"), a: col("adress", "address"), p: col("pin"),
        w: col("whatsapp number"), c: col("contact number", "contact"), q: col("quantity"),
        pay: col("payment option"), st: col("payment status"), ds: col("dispatch status"), dv: col("delivety status", "delivery status"),
      };
      const g = (r: string[], i: number) => (i >= 0 ? (r[i] ?? "").trim() : "");
      const parsed: Row[] = body.filter((r) => r.some((c) => c.trim())).map((r) => {
        const s = g(r, ix.st).toLowerCase(), p = g(r, ix.pay).toLowerCase();
        const cod = /cash on delivery|\bcod\b/.test(p) || /\bcod\b|cash/.test(s);
        let payment: Row["payment"] = null;
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
        };
      }).reverse();
      setRows(parsed); setPicked([]);
      if (parsed.length === 0) toast.success("No orders in this sheet yet");
    } catch {
      toast.error("Could not read this Google Sheet. Share it as 'Anyone with the link can view'.");
    } finally {
      setLoading(false);
    }
  }

  const currentStage = (r: Row): Stage =>
    /deliver/i.test(r.deliveryStatus) ? "feedback" : /dispatch/i.test(r.dispatchStatus) ? "dispatch" : /rec(ei|ie)ved/i.test(r.payStatus) ? "payment" : "order";

  const shown = useMemo(() => (rows ?? []).filter((r) => {
    const st = currentStage(r);
    if (filter === "pending" && st !== "order") return false;
    if (filter === "paid" && st !== "payment") return false;
    if (filter === "dispatched" && st !== "dispatch") return false;
    if (filter === "delivered" && st !== "feedback") return false;
    const s = q.trim().toLowerCase();
    return !s || [r.customer, r.pin, r.contact, r.whatsapp, r.books].some((v) => v.toLowerCase().includes(s));
  }), [rows, filter, q]);

  function importPicked() {
    if (!rows) return;
    let seq = peekOrderSeq();
    const chosen = rows.filter((r) => picked.includes(r.key));
    for (const r of chosen) {
      onAdd({
        orderId: formatOrderId(seq), customer: r.customer, address: r.address, pin: r.pin,
        // Label phone uses only the "Contact number" column — never "Whatsapp number".
        mobile: r.contact, book: r.books || DEFAULT_BOOK, post: DEFAULT_POST,
        payment: r.payment ?? (r.cod ? "COD" : "Prepaid"), qty: r.qty, amount: 260 * r.qty,
      });
      commitOrderSeq(seq); seq++;
    }
    const nextDone = [...done, ...chosen.map((r) => r.key)];
    localStorage.setItem(IMPORTED_KEY, JSON.stringify(nextDone));
    setDone(nextDone); setPicked([]); onDone();
    toast.success(`${chosen.length} order${chosen.length === 1 ? "" : "s"} added for labels`);
  }

  const filters: [Filter, string][] = [["all", "All"], ["pending", "New"], ["paid", "Paid"], ["dispatched", "Dispatched"], ["delivered", "Delivered"]];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          className="h-12 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm"
          value={active}
          onChange={(e) => saveSheets(sheets, Number(e.target.value))}
          aria-label="Google Sheet"
        >
          {sheets.map((s, i) => <option key={`${s.id}-${i}`} value={i}>{s.name}</option>)}
        </select>
        <Button variant="outline" className="h-12" onClick={() => setAdding((a) => !a)}>+ Sheet</Button>
        <Button variant="outline" className="h-12" onClick={removeSheet}>Remove</Button>
      </div>
      {adding && (
        <div className="space-y-2 rounded-md border p-3">
          <Input placeholder="Name (e.g. November orders)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Input placeholder="Google Sheet link" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          <Button className="w-full" onClick={addSheet}>Save sheet</Button>
        </div>
      )}
      <Button variant="outline" className="h-12 w-full" onClick={fetchRows} disabled={loading}>
        {loading ? "Loading…" : rows ? "Refresh orders from sheet" : "Load orders from sheet"}
      </Button>

      {rows && rows.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1">
            {filters.map(([f, l]) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{l}</Button>
            ))}
          </div>
          <Input placeholder="Search name, PIN, phone, book" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="space-y-2">
            {shown.map((r) => {
              const st = currentStage(r);
              const added = done.includes(r.key);
              return (
                <div key={r.key} className="space-y-2 rounded-md border p-3 text-sm">
                  <label className="flex gap-3">
                    <Checkbox
                      checked={picked.includes(r.key)}
                      onCheckedChange={(c) => setPicked((p) => (c ? [...p, r.key] : p.filter((k) => k !== r.key)))}
                    />
                    <div className="min-w-0">
                      <div className="font-medium">
                        {r.customer || "No name"} · {r.cod ? "COD" : "Prepaid"}{added && " · ✓ label added"}
                      </div>
                      {r.books && <div className="text-muted-foreground">{r.books}</div>}
                      <div className="truncate text-muted-foreground">{r.address}</div>
                      <div className="text-muted-foreground">PIN {r.pin || "missing"} · Contact {r.contact || "—"}</div>
                    </div>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {STAGES.map((s) => (
                      <Button key={s.id} asChild size="sm" variant={s.id === st ? "default" : "outline"} disabled={!r.whatsapp}>
                        <a href={r.whatsapp ? waLink(r.whatsapp, stageMessage(s.id, { name: r.customer, books: r.books, cod: r.cod })) : undefined} target="_blank" rel="noreferrer">
                          {s.label}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <Button className="h-12 w-full" onClick={importPicked} disabled={picked.length === 0}>
            Add {picked.length} selected for labels
          </Button>
        </>
      )}
    </div>
  );
}
