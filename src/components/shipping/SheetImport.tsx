import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Order } from "@/lib/shipping/types";
import { DEFAULT_BOOK, DEFAULT_POST, commitOrderSeq, formatOrderId, peekOrderSeq } from "@/lib/shipping/storage";
import { IMPORTED_KEY, ORDER_SHEET, fetchSheetRows, type SheetRow } from "@/lib/shipping/sheet";

type Row = SheetRow;

const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };

type Filter = "all" | "pending" | "paid" | "dispatched" | "delivered";

export function SheetImport({ onAdd, onDone }: { onAdd: (o: Omit<Order, "id">) => void; onDone: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [done, setDone] = useState<string[]>([]);

  useEffect(() => {
    setDone(read(IMPORTED_KEY, []));
  }, []);

  async function fetchRows() {
    setLoading(true);
    try {
      const parsed = await fetchSheetRows(ORDER_SHEET);
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
