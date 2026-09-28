import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { parseOrders, type ParsedRow } from "@/lib/shipping/parse";
import { SAMPLE_PASTE } from "@/lib/shipping/sample";
import type { Order } from "@/lib/shipping/types";

export function OrderPaste({
  onImport,
}: {
  onImport: (orders: Omit<Order, "id" | "tracking" | "service">[]) => void;
}) {
  const [text, setText] = useState("");
  const [removed, setRemoved] = useState<string[]>([]);

  const rows = useMemo(
    () => parseOrders(text).filter((r) => !removed.includes(r.key)),
    [text, removed],
  );
  const valid = rows.filter((r) => r.errors.length === 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Copy the rows from Excel or Google Sheets and paste them here. Column order: Order ID,
        Customer Name, Address, PIN Code, Mobile, Book Name, Quantity, Amount.
      </p>
      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setRemoved([]);
        }}
        placeholder={"ORD001\tAli Muhammed\t12/45 Main Road, Kottakkal\t676503\t9876543210\tBook name\t1\t220"}
        className="min-h-40 font-mono text-xs"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          className="h-11"
          onClick={() => {
            setText(SAMPLE_PASTE);
            setRemoved([]);
          }}
        >
          Load sample orders
        </Button>
        {text && (
          <Button
            variant="ghost"
            className="h-11"
            onClick={() => {
              setText("");
              setRemoved([]);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium">
            Preview — {valid.length} ready
            {rows.length - valid.length > 0 ? `, ${rows.length - valid.length} need attention` : ""}
          </div>

          <div className="hidden overflow-x-auto rounded-md border sm:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase">
                <tr>
                  {["Order ID", "Customer", "PIN", "Mobile", "Book", "Qty", "Amount", ""].map((h) => (
                    <th key={h} className="px-3 py-2 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Row key={r.key} row={r} onRemove={() => setRemoved((p) => [...p, r.key])} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 sm:hidden">
            {rows.map((r) => (
              <div key={r.key} className="rounded-md border p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{r.order.customer || "No name"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.order.orderId || "No order ID"} · PIN {r.order.pin || "—"} ·{" "}
                      {r.order.mobile || "—"}
                    </div>
                    <div className="mt-1 text-xs">
                      {r.order.book || "—"} × {r.order.qty} · ₹{r.order.amount}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remove row"
                    onClick={() => setRemoved((p) => [...p, r.key])}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {r.errors.length > 0 && (
                  <ul className="mt-2 list-inside list-disc text-xs text-destructive">
                    {r.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <Button
            className="h-12 w-full"
            disabled={valid.length === 0}
            onClick={() => {
              onImport(valid.map((r) => r.order));
              toast.success(`${valid.length} order${valid.length > 1 ? "s" : ""} added`);
              setText("");
              setRemoved([]);
            }}
          >
            Add {valid.length} Order{valid.length === 1 ? "" : "s"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ row, onRemove }: { row: ParsedRow; onRemove: () => void }) {
  const o = row.order;
  return (
    <tr className="border-t align-top">
      <td className="px-3 py-2">
        {o.orderId || "—"}
        {row.errors.length > 0 && (
          <div className="mt-1 text-xs text-destructive">{row.errors.join(" · ")}</div>
        )}
      </td>
      <td className="px-3 py-2">{o.customer || "—"}</td>
      <td className="px-3 py-2">{o.pin || "—"}</td>
      <td className="px-3 py-2">{o.mobile || "—"}</td>
      <td className="px-3 py-2">{o.book || "—"}</td>
      <td className="px-3 py-2">{o.qty}</td>
      <td className="px-3 py-2">₹{o.amount}</td>
      <td className="px-3 py-2">
        <Button size="icon" variant="ghost" aria-label="Remove row" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
