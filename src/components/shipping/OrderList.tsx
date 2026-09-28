import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil, Trash2 } from "lucide-react";
import { statusOf, type Order } from "@/lib/shipping/types";

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
        No orders yet. Paste orders from your sheet or add one manually.
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
          const status = statusOf(order);
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
                    <Badge variant={status === "Label Ready" ? "default" : "secondary"}>
                      {status}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {order.orderId} · PIN {order.pin} · {order.mobile || "no mobile"}
                  </div>
                  <div className="mt-1 text-xs">
                    {order.book || "—"} × {order.qty} · ₹{order.amount}
                    {order.service ? ` · ${order.service}` : ""}
                  </div>
                  <div className="mt-2">
                    <Label
                      htmlFor={`track-${order.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      Tracking / Consignment Number
                    </Label>
                    <Input
                      id={`track-${order.id}`}
                      className="mt-1 h-11 font-mono"
                      placeholder="EM123456789IN"
                      value={order.tracking}
                      onChange={(e) =>
                        onUpdate({ ...order, tracking: e.target.value.toUpperCase() })
                      }
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
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
                  <Label htmlFor="edit-amount">Amount</Label>
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
