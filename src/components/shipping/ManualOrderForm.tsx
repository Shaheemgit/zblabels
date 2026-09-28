import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Order } from "@/lib/shipping/types";

type Draft = Omit<Order, "id" | "tracking" | "service" | "qty" | "amount"> & {
  qty: string;
  amount: string;
};

const empty: Draft = {
  orderId: "",
  customer: "",
  address: "",
  pin: "",
  mobile: "",
  book: "",
  qty: "1",
  amount: "",
};

export function ManualOrderForm({
  onAdd,
}: {
  onAdd: (order: Omit<Order, "id" | "tracking" | "service">) => void;
}) {
  const [draft, setDraft] = useState<Draft>(empty);
  const set = (k: keyof Draft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order ID" value={draft.orderId} onChange={set("orderId")} />
        <Field label="Customer Name" value={draft.customer} onChange={set("customer")} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="m-address">Address</Label>
        <Textarea
          id="m-address"
          className="min-h-24"
          value={draft.address}
          onChange={(e) => set("address")(e.target.value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="PIN Code" value={draft.pin} onChange={set("pin")} numeric />
        <Field label="Mobile Number" value={draft.mobile} onChange={set("mobile")} numeric />
        <Field label="Book Name" value={draft.book} onChange={set("book")} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity" value={draft.qty} onChange={set("qty")} numeric />
          <Field label="Amount" value={draft.amount} onChange={set("amount")} numeric />
        </div>
      </div>
      <Button
        className="h-12 w-full sm:w-auto"
        onClick={() => {
          if (!draft.orderId.trim()) return toast.error("Order ID is required");
          if (!draft.customer.trim()) return toast.error("Customer name is required");
          if (!draft.address.trim()) return toast.error("Address is required");
          if (!/^\d{6}$/.test(draft.pin.trim())) return toast.error("PIN code is required");
          onAdd({
            ...draft,
            qty: Number.parseInt(draft.qty, 10) || 1,
            amount: Number.parseFloat(draft.amount) || 0,
          });
          setDraft(empty);
          toast.success("Order added");
        }}
      >
        Add Order
      </Button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  numeric,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  const id = `m-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="h-11"
        inputMode={numeric ? "numeric" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
