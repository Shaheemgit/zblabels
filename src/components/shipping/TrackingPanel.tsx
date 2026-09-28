import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Order } from "@/lib/shipping/types";

export function TrackingPanel({
  selectedOrders,
  onApply,
}: {
  selectedOrders: Order[];
  onApply: (numbers: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);

  const numbers = text
    .split(/\r?\n/)
    .map((l) => l.trim().toUpperCase())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Paste tracking numbers one per line. They are matched in order to the {selectedOrders.length}{" "}
        selected order{selectedOrders.length === 1 ? "" : "s"}. QR codes are made from exactly what
        you enter — they are not official India Post barcodes.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"EM123456789IN\nEM123456790IN"}
        className="min-h-32 font-mono text-sm"
      />
      <Button
        className="h-12 w-full"
        onClick={() => {
          if (selectedOrders.length === 0) {
            toast.error("Select at least one order");
            return;
          }
          if (numbers.length === 0) {
            toast.error("Paste at least one tracking number");
            return;
          }
          setConfirming(true);
        }}
      >
        Apply Tracking Numbers
      </Button>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply these tracking numbers?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  {Math.min(numbers.length, selectedOrders.length)} of {selectedOrders.length}{" "}
                  selected orders will be updated.
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {selectedOrders.slice(0, numbers.length).map((o, i) => (
                    <li key={o.id} className="font-mono text-xs">
                      {o.orderId} → {numbers[i]}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onApply(numbers);
                setText("");
                toast.success("Tracking numbers applied");
              }}
            >
              Apply
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
