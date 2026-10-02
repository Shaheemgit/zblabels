import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
import { SheetImport } from "@/components/shipping/SheetImport";
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
          "Create A4 shipping labels with payment details and a Zawiya Books Instagram QR code.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

let counter = 0;
const newId = () => `o${Date.now()}-${counter++}`;

function App() {
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

  function recordBatch(ready: Order[]) {
    const batch = { id: newId(), createdAt: new Date().toISOString(), orders: ready };
    setHistory((prev) => {
      const next = [batch, ...prev].slice(0, 50);
      saveHistory(next);
      return next;
    });
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
    recordBatch(ready);
    setBusy(true);
    try {
      const doc = await buildLabelsPdf(ready, sender);
      doc.save(pdfFileName(ready.length));
      const next = generated + ready.length;
      setGenerated(next);
      saveGeneratedCount(next);
      toast.success(`${ready.length} label${ready.length === 1 ? "" : "s"} saved as PDF`);
    } catch {
      toast.error("The PDF could not be created. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function printLabels() {
    const ready = guardLabels();
    if (!ready) return;
    recordBatch(ready);
    setShowPreview(true);
    window.setTimeout(() => window.print(), 300);
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      <header className="border-b print:hidden">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <h1 className="truncate text-xl font-semibold tracking-tight">Zawiya Books</h1>
          <p className="text-sm text-muted-foreground">Shipping Label Generator</p>
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

        <Section title="Add Order" step="1">
          <SheetImport onAdd={addOrder} onDone={() => setFormKey((k) => k + 1)} />
          <ManualOrderForm key={formKey} onAdd={addOrder} />
        </Section>

        <Section
          title="Orders"
          step="2"
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
            onUpdate={(updated) =>
              setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
            }
            onDelete={(id) => {
              setOrders((prev) => prev.filter((o) => o.id !== id));
              setSelected((prev) => prev.filter((x) => x !== id));
            }}
          />
        </Section>

        <Section title="Labels" step="3">
          <div className="flex flex-wrap gap-2">
            <Button
              className="h-12 flex-1"
              onClick={() => {
                if (guardLabels()) setShowPreview(true);
              }}
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

        <Section title="Previous Labels" step="4">
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
