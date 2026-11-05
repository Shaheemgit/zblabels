import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Printer, FileDown } from "lucide-react";
import { OrderDashboard } from "@/components/shipping/OrderDashboard";
import { ManualOrderForm } from "@/components/shipping/ManualOrderForm";
import { OrderList } from "@/components/shipping/OrderList";
import { LabelPreview } from "@/components/shipping/LabelPreview";
import { buildLabelsPdf, pdfFileName } from "@/lib/shipping/pdf";
import {
  loadGeneratedCount,
  loadHistory,
  saveHistory,
  type LabelBatch,
  loadOrders,
  loadSelected,
  loadSender,
  saveGeneratedCount,
  saveOrders,
  saveSelected,
} from "@/lib/shipping/storage";
import { emptySender, senderIsComplete, type Order, type Sender } from "@/lib/shipping/types";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import {
  clearOrders,
  deleteBatch,
  deleteOrder,
  fetchBatches,
  fetchOrders,
  insertBatch,
  insertOrder,
  updateOrder,
} from "@/lib/shipping/cloud";
import { allocateTrackingNumbers } from "@/lib/shipping/sheet.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zawiya Books — Shipping Label Generator" },
      {
        name: "description",
        content:
          "Create printable A4 shipping labels for Zawiya Books orders.",
      },
      { property: "og:title", content: "Zawiya Books — Shipping Label Generator" },
      {
        property: "og:description",
        content:
          "Create printable A4 shipping labels with unique India Post tracking barcodes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
const newId = () => crypto.randomUUID();
const cloudErr = () => toast.error("Could not save to your account. Please try again.");

function App() {
  const { session, userId } = useAuth();
  const allocateTrackingFn = useServerFn(allocateTrackingNumbers);
  const [sender, setSender] = useState<Sender>(emptySender);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [generated, setGenerated] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [history, setHistory] = useState<LabelBatch<Order>[]>([]);
  const [viewBatch, setViewBatch] = useState<string | null>(null);

  useEffect(() => {
    setSender(loadSender());
    setGenerated(loadGeneratedCount());
    setHistory(loadHistory<Order>());
    const savedOrders = loadOrders<Order>();
    setOrders(savedOrders);
    const savedSelected = loadSelected();
    setSelected(savedSelected.filter((id) => savedOrders.some((o) => o.id === id)));
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        let cloudOrders = await fetchOrders();
        if (cloudOrders.length === 0) {
          const local = loadOrders<Order>().map((o) => (isUuid(o.id) ? o : { ...o, id: newId() }));
          for (const o of local) await insertOrder(o, userId);
          cloudOrders = local;
        }
        let batches = await fetchBatches();
        if (batches.length === 0) {
          const local = loadHistory<Order>().map((b) => (isUuid(b.id) ? b : { ...b, id: newId() }));
          for (const b of local) await insertBatch(b, userId);
          batches = local;
        }
        setOrders(cloudOrders);
        setSelected((prev) => prev.filter((id) => cloudOrders.some((o) => o.id === id)));
        setHistory(batches);
        saveHistory(batches);
      } catch {
        toast.error("Could not load your saved data.");
      }
    })();
  }, [userId]);

  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  useEffect(() => {
    saveSelected(selected);
  }, [selected]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected.includes(o.id)),
    [orders, selected],
  );
  function addOrder(order: Omit<Order, "id">) {
    const created = { ...order, id: newId() };
    setOrders((prev) => [...prev, created]);
    setSelected((prev) => [...prev, created.id]);
    if (userId) insertOrder(created, userId).catch(cloudErr);
  }

  function guardLabels(): Order[] | null {
    if (selectedOrders.length === 0) {
      toast.error("Select at least one order");
      return null;
    }
    if (!senderIsComplete(sender)) {
      toast.error("Complete sender details in Settings");
      return null;
    }
    return selectedOrders;
  }

  async function prepareLabels(ordersToPrepare: Order[]): Promise<Order[] | null> {
    if (!userId) {
      toast.error("Sign in with Google to assign unique India Post tracking numbers");
      return null;
    }
    try {
      const assignments = [] as Awaited<ReturnType<typeof allocateTrackingFn>>;
      for (let i = 0; i < ordersToPrepare.length; i += 100) {
        const group = ordersToPrepare.slice(i, i + 100);
        assignments.push(...await allocateTrackingFn({
          data: {
            orders: group.map((order) => ({
              id: order.id,
              ...(order.sheetRow === undefined ? {} : { sheetRow: order.sheetRow }),
              ...(order.sheetKey ? { sheetKey: order.sheetKey } : {}),
            })),
          },
        }));
      }
      const byId = new Map(assignments.map((item) => [item.id, item.tracking]));
      const prepared = ordersToPrepare.map((order) => {
        const tracking = byId.get(order.id) ?? order.tracking;
        return tracking ? { ...order, tracking } : order;
      });
      setOrders((prev) => prev.map((order) => {
        const tracking = byId.get(order.id) ?? order.tracking;
        return tracking ? { ...order, tracking } : order;
      }));
      if (userId) {
        await Promise.all(prepared.map((order) => updateOrder(order)));
      }
      return prepared;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not assign tracking numbers or update the order sheet");
      return null;
    }
  }

  function recordBatch(ready: Order[]) {
    const batch = { id: newId(), createdAt: new Date().toISOString(), orders: ready };
    setHistory((prev) => {
      const next = [batch, ...prev].slice(0, 50);
      saveHistory(next);
      return next;
    });
    if (userId) insertBatch(batch, userId).catch(cloudErr);
  }

  async function redownload(batch: LabelBatch<Order>) {
    try {
      const doc = await buildLabelsPdf(batch.orders, sender);
      doc.save(pdfFileName(batch.orders.length));
    } catch {
      toast.error("The PDF could not be created. Please try again.");
    }
  }

  async function downloadPdf() {
    const ready = guardLabels();
    if (!ready) return;
    setBusy(true);
    try {
      const prepared = await prepareLabels(ready);
      if (!prepared) return;
      recordBatch(prepared);
      const doc = await buildLabelsPdf(prepared, sender);
      doc.save(pdfFileName(prepared.length));
      const next = generated + prepared.length;
      setGenerated(next);
      saveGeneratedCount(next);
      toast.success(`${prepared.length} label${prepared.length === 1 ? "" : "s"} saved as PDF`);
    } catch {
      toast.error("The PDF could not be created. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function printLabels() {
    const ready = guardLabels();
    if (!ready) return;
    setBusy(true);
    const prepared = await prepareLabels(ready);
    if (!prepared) { setBusy(false); return; }
    recordBatch(prepared);
    const trackingById = new Map(prepared.map((order) => [order.id, order.tracking]));
    setOrders((prev) => prev.map((order) => {
      const tracking = trackingById.get(order.id) ?? order.tracking;
      return tracking ? { ...order, tracking } : order;
    }));
    setShowPreview(true);
    window.setTimeout(() => window.print(), 300);
    setBusy(false);
  }

  async function previewLabels() {
    const ready = guardLabels();
    if (!ready) return;
    setBusy(true);
    const prepared = await prepareLabels(ready);
    if (prepared) {
      recordBatch(prepared);
      const trackingById = new Map(prepared.map((order) => [order.id, order.tracking]));
      setOrders((prev) => prev.map((order) => {
        const tracking = trackingById.get(order.id) ?? order.tracking;
        return tracking ? { ...order, tracking } : order;
      }));
      setShowPreview(true);
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      <header className="border-b print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">Zawiya Books</h1>
            <p className="text-sm text-muted-foreground">Shipping Label Generator</p>
          </div>
          {session ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                {session.user.email}
              </span>
              <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                Sign out
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const r = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (r.error) toast.error("Google sign-in failed. Please try again.");
              }}
            >
              Sign in with Google
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-32 pt-6 print:hidden">
        <section className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Orders loaded", orders.length],
            ["Selected labels", selectedOrders.length],
            ["Labels generated", generated],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border p-3">
              <div className="text-2xl font-semibold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </section>

        <Section title="Order Management" step="1">
          <OrderDashboard onAdd={addOrder} signedIn={Boolean(userId)} />
        </Section>

        <Section title="Add Order" step="2">
          <ManualOrderForm key={formKey} onAdd={addOrder} />
        </Section>

        <Section
          title="Label Queue"
          step="3"
          action={
            orders.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    Clear All Orders
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear all orders?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes every order in this batch. Your saved sender details stay.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        setOrders([]);
                        setSelected([]);
                        setShowPreview(false);
                        if (userId) clearOrders().catch(cloudErr);
                        toast.success("All orders cleared");
                      }}
                    >
                      Clear
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )
          }
        >
          <OrderList
            orders={orders}
            selected={selected}
            onToggle={(id) =>
              setSelected((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              )
            }
            onToggleAll={(checked) => setSelected(checked ? orders.map((o) => o.id) : [])}
            onUpdate={(updated) => {
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
              if (userId) updateOrder(updated).catch(cloudErr);
            }}
            onDelete={(id) => {
              setOrders((prev) => prev.filter((o) => o.id !== id));
              setSelected((prev) => prev.filter((x) => x !== id));
              if (userId) deleteOrder(id).catch(cloudErr);
            }}
          />
        </Section>

        <Section title="Labels" step="4">
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-12 flex-1"
              onClick={previewLabels}
              disabled={busy}
            >
              Preview Labels
            </Button>
            <Button variant="outline" className="h-12 flex-1" onClick={downloadPdf} disabled={busy}>
              <FileDown className="mr-2 h-4 w-4" />
              {busy ? "Preparing…" : "Download PDF"}
            </Button>
            <Button variant="outline" className="h-12 flex-1" onClick={printLabels}>
              <Printer className="mr-2 h-4 w-4" />
              Print Labels
            </Button>
          </div>
          {showPreview && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  A4 portrait · 4 labels per page · {selectedOrders.length} selected
                </p>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(false)}>
                  Return to editing
                </Button>
              </div>
              <LabelPreview orders={selectedOrders} sender={sender} />
            </div>
          )}
        </Section>

        <Section title="Previous Labels" step="5">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Labels you download or print will appear here.</p>
          ) : (
            <div className="space-y-2">
              {history.map((b) => (
                <div key={b.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {new Date(b.createdAt).toLocaleString()} · {b.orders.length} label{b.orders.length === 1 ? "" : "s"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {b.orders.map((o) => `${o.orderId} ${o.customer}`).join(", ")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setViewBatch(viewBatch === b.id ? null : b.id)}>
                        {viewBatch === b.id ? "Hide" : "View"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => redownload(b)}>PDF</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          const next = history.filter((x) => x.id !== b.id);
                          setHistory(next);
                          saveHistory(next);
                          if (userId) deleteBatch(b.id).catch(cloudErr);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  {viewBatch === b.id && (
                    <div className="mt-3">
                      <LabelPreview orders={b.orders} sender={sender} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

      </main>

      {showPreview && selectedOrders.length > 0 && (
        <div className="hidden print:block">
          <LabelPreview orders={selectedOrders} sender={sender} />
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t bg-background p-3 print:hidden sm:hidden">
        <Button className="h-12 w-full" onClick={downloadPdf} disabled={busy}>
          Generate Labels ({selectedOrders.length})
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  step,
  action,
  id,
  children,
}: {
  title: string;
  step: string;
  action?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b pb-2">
        <h2 className="truncate text-sm font-semibold uppercase tracking-wide">
          <span className="mr-2 text-muted-foreground">{step}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
