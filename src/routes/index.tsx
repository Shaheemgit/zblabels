import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Printer, FileDown, Settings as SettingsIcon } from "lucide-react";
import { OrderPaste } from "@/components/shipping/OrderPaste";
import { ManualOrderForm } from "@/components/shipping/ManualOrderForm";
import { OrderList } from "@/components/shipping/OrderList";
import { TrackingPanel } from "@/components/shipping/TrackingPanel";
import { LabelPreview } from "@/components/shipping/LabelPreview";
import { SenderSettings } from "@/components/shipping/SenderSettings";
import { buildLabelsPdf, pdfFileName } from "@/lib/shipping/pdf";
import {
  loadGeneratedCount,
  loadSender,
  loadService,
  saveGeneratedCount,
  saveSender,
  saveService,
} from "@/lib/shipping/storage";
import { emptySender, senderIsComplete, SERVICES, type Order, type Sender } from "@/lib/shipping/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zawiya Books — Shipping Label Generator" },
      {
        name: "description",
        content:
          "Internal tool for Zawiya Books: paste book orders, add India Post tracking numbers and print A4 shipping labels.",
      },
      { property: "og:title", content: "Zawiya Books — Shipping Label Generator" },
      {
        property: "og:description",
        content:
          "Paste orders from a sheet, add India Post tracking numbers and print A4 shipping labels with QR codes.",
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
  const [service, setService] = useState<string>("Speed Post");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [generated, setGenerated] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSender(loadSender());
    setService(loadService("Speed Post"));
    setGenerated(loadGeneratedCount());
  }, []);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected.includes(o.id)),
    [orders, selected],
  );
  const labelsReady = orders.filter((o) => o.tracking.trim()).length;

  function addOrders(incoming: Omit<Order, "id" | "tracking" | "service">[]) {
    const created = incoming.map((o) => ({ ...o, id: newId(), tracking: "", service }));
    setOrders((prev) => [...prev, ...created]);
    setSelected((prev) => [...prev, ...created.map((o) => o.id)]);
  }

  function pickService(value: string) {
    setService(value);
    saveService(value);
    setOrders((prev) => prev.map((o) => ({ ...o, service: value })));
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
    const missing = selectedOrders.filter((o) => !o.tracking.trim());
    if (missing.length > 0) {
      toast.error("Add a tracking number before generating the label");
      return null;
    }
    return selectedOrders;
  }

  async function downloadPdf() {
    const ready = guardLabels();
    if (!ready) return;
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
    setShowPreview(true);
    window.setTimeout(() => window.print(), 300);
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster />

      <header className="border-b print:hidden">
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight">Zawiya Books</h1>
            <p className="text-sm text-muted-foreground">Shipping Label Generator</p>
          </div>
          <Button variant="outline" size="icon" aria-label="Settings" asChild>
            <a href="#settings">
              <SettingsIcon className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 pb-32 pt-6 print:hidden">
        <section className="grid grid-cols-3 gap-2 text-center">
          {[
            ["Orders loaded", orders.length],
            ["Labels ready", labelsReady],
            ["Labels generated", generated],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-md border p-3">
              <div className="text-2xl font-semibold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </section>

        <Section title="New Batch" step="1">
          <Tabs defaultValue="paste">
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="paste">
                Paste Orders
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="manual">
                Add Order
              </TabsTrigger>
            </TabsList>
            <TabsContent value="paste" className="pt-4">
              <OrderPaste onImport={addOrders} />
            </TabsContent>
            <TabsContent value="manual" className="pt-4">
              <ManualOrderForm onAdd={(o) => addOrders([o])} />
            </TabsContent>
          </Tabs>
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

        <Section title="Shipping Service" step="3">
          <Select value={service} onValueChange={pickService}>
            <SelectTrigger className="h-12 w-full">
              <SelectValue placeholder="Select India Post service" />
            </SelectTrigger>
            <SelectContent>
              {SERVICES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Section>

        <Section title="Tracking" step="4">
          <TrackingPanel
            selectedOrders={selectedOrders}
            onApply={(numbers) => {
              const ids = selectedOrders.map((o) => o.id);
              setOrders((prev) =>
                prev.map((o) => {
                  const index = ids.indexOf(o.id);
                  return index >= 0 && numbers[index] ? { ...o, tracking: numbers[index] } : o;
                }),
              );
            }}
          />
        </Section>

        <Section title="Labels" step="5">
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

        <Section title="Settings" step="6" id="settings">
          <SenderSettings
            sender={sender}
            onSave={(s) => {
              setSender(s);
              saveSender(s);
            }}
          />
        </Section>
      </main>

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
