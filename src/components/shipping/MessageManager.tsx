import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { STAGES, stageMessage, waLink } from "@/lib/shipping/whatsapp";
import { ORDER_SHEET, fetchSheetRows, stageOf, type SheetRow } from "@/lib/shipping/sheet";

type Filter = "all" | "order" | "payment" | "dispatch" | "feedback";

const FILTERS: [Filter, string][] = [
  ["all", "All"], ["order", "New"], ["payment", "Paid"], ["dispatch", "Dispatched"], ["feedback", "Delivered"],
];

// Dedicated section for customer messaging. Reads the single maintained order sheet
// and keeps its own loading, filtering and stage buttons.
export function MessageManager() {
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  async function loadRows() {
    setLoading(true);
    try {
      const parsed = await fetchSheetRows(ORDER_SHEET);
      setRows(parsed);
      if (parsed.length === 0) toast.success("No orders in this sheet yet");
    } catch {
      toast.error("Could not read this Google Sheet. Share it as 'Anyone with the link can view'.");
    } finally {
      setLoading(false);
    }
  }

  const shown = useMemo(() => (rows ?? []).filter((r) => {
    if (filter !== "all" && stageOf(r) !== filter) return false;
    const s = q.trim().toLowerCase();
    return !s || [r.customer, r.pin, r.whatsapp, r.books].some((v) => v.toLowerCase().includes(s));
  }), [rows, filter, q]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Send order updates on WhatsApp. Buttons open a ready-made message for the customer — nothing is sent automatically.
      </p>
      <Button variant="outline" className="h-12 w-full" onClick={loadRows} disabled={loading}>
        {loading ? "Loading…" : rows ? "Refresh" : "Load"}
      </Button>

      {rows && rows.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map(([f, l]) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>{l}</Button>
            ))}
          </div>
          <Input placeholder="Search name, PIN, phone, book" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="space-y-2">
            {shown.map((r) => {
              const st = stageOf(r);
              return (
                <div key={r.key} className="space-y-2 rounded-md border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium">{r.customer || "No name"} · {r.cod ? "COD" : "Prepaid"}</div>
                    {r.books && <div className="text-muted-foreground">{r.books}</div>}
                    <div className="text-muted-foreground">PIN {r.pin || "missing"} · WhatsApp {r.whatsapp || "—"}</div>
                  </div>
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
        </>
      )}
      {rows && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No orders in this sheet yet.</p>
      )}
    </div>
  );
}
