import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { orderTotals, type Order } from "@/lib/shipping/types";

const UPI_ID = "8921291146@ptsbi";
const PAYEE_NAME = "Zawiya Books";
const PAYMENT_AMOUNT = { Prepaid: 290, COD: 295 } as const;

function paymentLink(payment: Order["payment"]): string {
  return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(PAYEE_NAME)}&am=${PAYMENT_AMOUNT[payment]}&cu=INR`;
}

export function whatsappHref(order: Order): string {
  const digits = order.mobile.replace(/\D/g, "");
  const to = digits.length === 10 ? `91${digits}` : digits;
  const lines = [
    `നമസ്കാരം ${order.customer},`,
    ``,
    `നിങ്ങളുടെ ഓർഡർ ${order.orderId} (${order.book} × ${order.qty}) തയ്യാറായി. വൈകാതെ അയച്ചുതരുന്നതാണ്.`,
  ];
  if (order.payment === "Prepaid") {
    lines.push(``, `പേയ്മെന്റ് ഈ ലിങ്ക് ഉപയോഗിച്ച് ചെയ്യാം:`, paymentLink(order.payment));
  } else {
    lines.push(``, `പേയ്മെന്റ് ഡെലിവറി സമയത്ത് നൽകാം.`);
  }
  return `https://wa.me/${to}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function OrderList({
  orders,
  selected,
  onToggle,
  onToggleAll,
  onUpdate,
  onDelete,
}: {
  orders: Order[];
  selected: string[];
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onUpdate: (order: Order) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<Order | null>(null);
  const allSelected = orders.length > 0 && selected.length === orders.length;

  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No orders yet. Add an order above to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-sm font-medium">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(c) => onToggleAll(Boolean(c))}
          aria-label="Select all orders"
        />
        Select All ({selected.length}/{orders.length})
      </label>

      <div className="space-y-3">
        {orders.map((order) => {
          return (
            <div key={order.id} className="rounded-md border p-3">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                <Checkbox
                  className="mt-1"
                  checked={selected.includes(order.id)}
                  onCheckedChange={() => onToggle(order.id)}
                  aria-label={`Select ${order.orderId}`}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{order.customer}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {order.orderId} · PIN {order.pin} · {order.mobile || "no mobile"}
                  </div>
                  <div className="mt-1 text-xs">
                    {order.book || "—"} × {order.qty} · ₹{orderTotals(order).total}
                    {order.post ? ` · ${order.post}` : ""} · {order.payment}
                  </div>
                  <div className="mt-2">
                    <Label
                      htmlFor={`post-${order.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      Post / Service
                    </Label>
                    <Input
                      id={`post-${order.id}`}
                      className="mt-1 h-11"
                      placeholder="e.g. Speed Post"
                      value={order.post}
                      onChange={(e) => onUpdate({ ...order, post: e.target.value })}
                    />
                  </div>
                  <div className="mt-2 space-y-1">
                    <Label htmlFor={`payment-${order.id}`} className="text-xs text-muted-foreground">Payment</Label>
                    <Select value={order.payment} onValueChange={(value: "Prepaid" | "COD") => onUpdate({ ...order, payment: value })}>
                      <SelectTrigger id={`payment-${order.id}`} className="h-11 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Prepaid">Prepaid</SelectItem><SelectItem value="COD">COD</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Send WhatsApp message"
                    onClick={() => window.open(whatsappHref(order), "_blank")}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Edit order"
                    onClick={() => setEditing(order)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Delete order"
                    onClick={() => onDelete(order.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit order</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              {(
                [
                  ["orderId", "Order ID"],
                  ["customer", "Customer Name"],
                  ["pin", "PIN Code"],
                  ["mobile", "Mobile Number"],
                  ["book", "Book Name"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={`edit-${key}`}>{label}</Label>
                  <Input
                    id={`edit-${key}`}
                    className="h-11"
                    value={editing[key]}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label htmlFor="edit-address">Address</Label>
                <Textarea
                  id="edit-address"
                  className="min-h-24"
                  value={editing.address}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-qty">Quantity</Label>
                  <Input
                    id="edit-qty"
                    className="h-11"
                    inputMode="numeric"
                    value={String(editing.qty)}
                    onChange={(e) =>
                      setEditing({ ...editing, qty: Number.parseInt(e.target.value, 10) || 1 })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-amount">Book Price</Label>
                  <Input
                    id="edit-amount"
                    className="h-11"
                    inputMode="numeric"
                    value={String(editing.amount)}
                    onChange={(e) =>
                      setEditing({ ...editing, amount: Number.parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              className="h-11 w-full"
              onClick={() => {
                if (editing) onUpdate(editing);
                setEditing(null);
              }}
            >
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
