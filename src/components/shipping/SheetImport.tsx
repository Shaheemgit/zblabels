import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Order } from "@/lib/shipping/types";
import { DEFAULT_BOOK, DEFAULT_POST, commitOrderSeq, formatOrderId, peekOrderSeq } from "@/lib/shipping/storage";
import {
  ACTIVE_KEY, DEFAULT_SHEETS, IMPORTED_KEY, SHEETS_KEY,
  fetchSheetRows, type SavedSheet, type SheetRow,
} from "@/lib/shipping/sheet";

type Row = SheetRow;

const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };

export function parseSheetUrl(url: string): { id: string; gid?: string | undefined } | null {
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
    if (!p) { toast.error("Paste a valid Google Sheet link"); return; }
    const next = [...sheets, { name: newName.trim() || `Sheet ${sheets.length + 1}`, ...p }];
    saveSheets(next, next.length - 1);
    setNewName(""); setNewUrl(""); setAdding(false);
  }

  function removeSheet() {
    if (sheets.length <= 1 || !sheet) { toast.error("Keep at least one sheet"); return; }
    if (!confirm(`Remove "${sheet.name}" from the list?`)) return;
    saveSheets(sheets.filter((_, i) => i !== active), 0);
  }

  async function fetchRows() {
    if (!sheet) return;
    setLoading(true);
    try {
      const parsed = await fetchSheetRows(sheet);
      setRows(parsed); setPicked([]);
      if (parsed.length === 0) toast.success("No orders in this sheet yet");
    } catch {
      toast.error("Could not read this Google Sheet. Share it as 'Anyone with the link can view'.");
    } finally {
      setLoading(false);
    }
  }

  const currentStage = (r: Row): "order" | "payment" | "dispatch" | "feedback" =>
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
        payment: r.payment ?? (r.cod ? "COD" : "Prepaid"), qty: r.qty,
        // Amount comes from the prices written in the books column; fall back to ₹260 per book when none is listed.
        amount: r.amount > 0 ? r.amount : 260 * r.qty,
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
