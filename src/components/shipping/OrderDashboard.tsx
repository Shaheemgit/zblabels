import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { STAGES, stageMessage, waLink, type Stage } from "@/lib/shipping/whatsapp";
import {
  ORDER_SHEET, fetchSheetRows, isPendingPrepaid, stageOf, statusWriteValue,
  type SheetRow, type WriteStage,
} from "@/lib/shipping/sheet";
import { loadLabeledKeys, saveLabeledKeys } from "@/lib/shipping/storage";
import { updateSheetStatus } from "@/lib/shipping/sheet.functions";
import { amountText, payableText, type Order } from "@/lib/shipping/types";
import { DEFAULT_BOOK, DEFAULT_POST, commitOrderSeq, formatOrderId, peekOrderSeq } from "@/lib/shipping/storage";

type Filter = "all" | Stage | "labeled" | "unlabeled";

const STAGE_LABEL: Record<Stage, string> = {
  order: "New", payment: "Paid", dispatch: "Dispatched", feedback: "Delivered",
};
const STAGE_RANK: Record<Stage, number> = { order: 0, payment: 1, dispatch: 2, feedback: 3 };
const WRITE_RANK: Record<WriteStage, number> = { payment: 1, dispatch: 2, delivery: 3 };

// Single order-management dashboard: every order from the maintained Google Sheet
// with its stage, WhatsApp actions, label action and sheet status updates.
export function OrderDashboard({ onAdd, signedIn }: { onAdd: (o: Omit<Order, "id">) => void; signedIn: boolean }) {
  const updateStatusFn = useServerFn(updateSheetStatus);
  const [rows, setRows] = useState<SheetRow[] | null>(null);
  const [labeled, setLabeled] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
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

  useEffect(() => {
    setLabeled(loadLabeledKeys());
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: (rows ?? []).length, order: 0, payment: 0, dispatch: 0, feedback: 0, labeled: 0, unlabeled: 0 };
    for (const r of rows ?? []) {
      c[stageOf(r)]++;
      if (labeled.includes(r.key)) c.labeled++; else c.unlabeled++;
    }
    return c;
  }, [rows, labeled]);

  const shown = useMemo(() => (rows ?? []).filter((r) => {
    if (filter === "labeled") { if (!labeled.includes(r.key)) return false; }
    else if (filter === "unlabeled") { if (labeled.includes(r.key)) return false; }
    else if (filter !== "all" && stageOf(r) !== filter) return false;
    const s = q.trim().toLowerCase();
    return !s || [r.customer, r.pin, r.contact, r.whatsapp, r.books, r.tracking].some((v) => v.toLowerCase().includes(s));
  }), [rows, filter, q]);

  async function mark(r: SheetRow, stage: WriteStage) {
    if (!signedIn) { toast.error("Sign in with Google to update the sheet"); return; }
    const st = stageOf(r);
    if (STAGE_RANK[st] >= WRITE_RANK[stage]) return;
    setSaving(`${r.key}:${stage}`);
    try {
      const res = await updateStatusFn({ data: { row: r.sheetRow, stage } });
      const value = statusWriteValue(stage);
      setRows((prev) => (prev ?? []).map((x) => x.key !== r.key ? x : {
        ...x,
        payStatus: stage === "payment" ? value : x.payStatus,
        dispatchStatus: stage === "dispatch" ? value : x.dispatchStatus,
        deliveryStatus: stage === "delivery" ? value : x.deliveryStatus,
      }));
      toast.success(`${r.customer || "Order"} marked "${res.value}" in the sheet`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the sheet");
    } finally {
      setSaving(null);
    }
  }

  function addLabel(r: SheetRow) {
    const seq = peekOrderSeq();
    onAdd({
      orderId: formatOrderId(seq), customer: r.customer, address: r.address, pin: r.pin,
      // Label phone uses only the "Contact number" column — never "Whatsapp number".
      mobile: r.contact, book: r.books || DEFAULT_BOOK, post: DEFAULT_POST,
      payment: r.payment ?? (r.cod ? "COD" : "Prepaid"), qty: r.qty,
      // Amount comes from the prices written in the books column; fall back to ₹260 per book when none is listed.
      amount: r.amount > 0 ? r.amount : 260 * r.qty,
    });
    commitOrderSeq(seq);
  }

  function markLabeled(keys: string[]) {
    setLabeled((prev) => {
      const next = Array.from(new Set([...prev, ...keys]));
      saveLabeledKeys(next);
      return next;
    });
  }

  function makeLabel(r: SheetRow) {
    if (isPendingPrepaid(r)) { toast.error("Payment pending — the label unlocks once payment is received"); return; }
    if (labeled.includes(r.key)) { toast.info("Label already created for this order"); return; }
    addLabel(r);
    markLabeled([r.key]);
    toast.success("Order added to the label queue");
  }

  // Bulk: queue every order currently shown by the filter/search, skipping ones
  // already labeled or prepaid orders whose payment is still pending.
  function makeAllLabels() {
    const pending = shown.filter((r) => !labeled.includes(r.key) && !isPendingPrepaid(r));
    if (pending.length === 0) { toast.info("Nothing to queue — shown orders are already labeled or payment is pending"); return; }
    for (const r of pending) addLabel(r);
    markLabeled(pending.map((r) => r.key));
    toast.success(`${pending.length} order${pending.length === 1 ? "" : "s"} added to the label queue`);
  }

  const writeStages: [WriteStage, string][] = [
    ["payment", "Mark Paid"], ["dispatch", "Mark Dispatched"], ["delivery", "Mark Delivered"],
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button variant="outline" className="h-12 flex-1" onClick={loadRows} disabled={loading}>
          {loading ? "Loading…" : rows ? "Refresh orders" : "Load orders"}
        </Button>
        {rows !== null && shown.length > 0 && (
          <Button className="h-12 flex-1" onClick={makeAllLabels}>
            Make labels for all ({shown.filter((r) => !labeled.includes(r.key) && !isPendingPrepaid(r)).length})
          </Button>
        )}
      </div>

      {rows && (
        <>
          <div className="flex flex-wrap gap-1">
            {(["all", "order", "payment", "dispatch", "feedback", "labeled", "unlabeled"] as Filter[]).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : f === "labeled" ? "Label created" : f === "unlabeled" ? "Not labeled" : STAGE_LABEL[f]} ({counts[f]})
              </Button>
            ))}
          </div>
          <Input placeholder="Search name, PIN, phone, book, tracking" value={q} onChange={(e) => setQ(e.target.value)} />

          <div className="space-y-2">
            {shown.map((r) => {
              const st = stageOf(r);
              const isLabeled = labeled.includes(r.key);
              return (
                <div
                  key={r.key}
                  className={
                    isLabeled
                      ? "space-y-2 rounded-md border border-primary bg-primary/10 p-3 text-sm"
                      : "space-y-2 rounded-md border p-3 text-sm"
                  }
                >
                  <div className={`-m-3 mb-2 flex items-start justify-between gap-2 rounded-t-md px-3 py-2 ${r.cod ? "bg-cod text-cod-foreground" : "bg-prepaid text-prepaid-foreground"}`}>
                    <div className="min-w-0">
                      <div className="font-medium">{r.customer || "No name"} · {r.cod ? "COD" : "Prepaid"}</div>
                    </div>
                    <div className="flex shrink-0 items-start gap-1">
                      {isLabeled && (
                        <span className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground">✓ Label created</span>
                      )}
                      <span className="rounded border border-current/40 px-2 py-0.5 text-xs">{st === "payment" && r.cod ? "COD" : STAGE_LABEL[st]}</span>
                    </div>
                  </div>
                  <div className="text-muted-foreground">
                    {amountText({ amount: r.amount, payment: r.payment ?? "Prepaid" })}
                    {r.cod && ` · ${payableText({ amount: r.amount, payment: "COD" })}`}
                  </div>
                  {r.books && <div className="text-muted-foreground">{r.books}</div>}
                  <div className="truncate text-muted-foreground">{r.address}</div>
                  <div className="text-muted-foreground">
                    PIN {r.pin || "missing"} · Contact {r.contact || "—"}{r.whatsapp && r.whatsapp !== r.contact && ` · WhatsApp ${r.whatsapp}`}
                  </div>
                  {r.tracking && <div className="text-muted-foreground">Tracking: {r.tracking}</div>}

                  <div className="flex flex-wrap gap-1">
                    {isPendingPrepaid(r) ? (
                      <span className="rounded-md border border-input px-2 py-1 text-xs text-muted-foreground">
                        Payment pending — no label yet
                      </span>
                    ) : (
                      <Button size="sm" variant={isLabeled ? "outline" : "default"} onClick={() => makeLabel(r)}>
                        {isLabeled ? "✓ Label created" : "Make label"}
                      </Button>
                    )}
                    {/* COD orders are paid on delivery: "Cash on Delivery" stands in for "Mark Paid". */}
                    {writeStages.map(([ws, label]) => {
                      const isCodPayment = ws === "payment" && r.cod;
                      const text = isCodPayment ? "Cash on Delivery" : label;
                      const reached = isCodPayment || STAGE_RANK[st] >= WRITE_RANK[ws];
                      return (
                        <Button
                          key={ws}
                          size="sm"
                          variant={reached ? "secondary" : "outline"}
                          disabled={reached || saving === `${r.key}:${ws}`}
                          onClick={() => mark(r, ws)}
                        >
                          {saving === `${r.key}:${ws}` ? "Saving…" : text}
                        </Button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {STAGES.map((s) => (
                      <Button key={s.id} asChild size="sm" variant={s.id === st ? "default" : "outline"} disabled={!r.whatsapp}>
                        <a href={r.whatsapp ? waLink(r.whatsapp, stageMessage(s.id, { name: r.customer, books: r.books, cod: r.cod })) : undefined} target="_blank" rel="noreferrer">
                            {/* COD orders confirm with "Cash on Delivery", not "Payment Received". */}
                            {(s.id === "payment" && r.cod ? "💵 Cash on Delivery" : s.label)}
                        </a>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
            {shown.length === 0 && (
              <p className="text-sm text-muted-foreground">No orders match this filter.</p>
            )}
          </div>
        </>
      )}
      {rows && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No orders in this sheet yet.</p>
      )}
    </div>
  );
}
