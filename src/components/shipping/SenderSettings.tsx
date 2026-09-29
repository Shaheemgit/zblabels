import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import type { Sender } from "@/lib/shipping/types";

const FIELDS: { key: keyof Sender; label: string }[] = [
  { key: "name", label: "Sender Name" },
  { key: "address1", label: "Address Line 1" },
  { key: "address2", label: "Address Line 2" },
  { key: "place", label: "Place" },
  { key: "postOffice", label: "Post Office" },
  { key: "district", label: "District" },
  { key: "state", label: "State" },
  { key: "pin", label: "PIN Code" },
  { key: "mobile", label: "Mobile Number" },
];

export function SenderSettings({
  sender,
  onSave,
}: {
  sender: Sender;
  onSave: (sender: Sender) => void;
}) {
  const [draft, setDraft] = useState<Sender>(sender);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key} className="space-y-1.5">
            <Label htmlFor={`sender-${f.key}`}>{f.label}</Label>
            <Input
              id={`sender-${f.key}`}
              className="h-11"
              value={draft[f.key]}
              inputMode={f.key === "pin" || f.key === "mobile" ? "numeric" : "text"}
              onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <Button
        className="h-12 w-full sm:w-auto"
        onClick={() => {
          if (!draft.name.trim() || !draft.address1.trim() || !draft.place.trim() || !draft.pin.trim()) {
            toast.error("Sender name, address, place and PIN code are required");
            return;
          }
          onSave(draft);
          toast.success("Sender details saved on this device");
        }}
      >
        Save Sender Details
      </Button>
    </div>
  );
}
