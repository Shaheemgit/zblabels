import { emptySender, type Sender } from "./types";

const SENDER_KEY = "zawiya.sender";
const GENERATED_KEY = "zawiya.generatedCount";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadSender(): Sender {
  const saved = read<Sender>(SENDER_KEY, emptySender);
  return {
    ...saved,
    name: saved.name || emptySender.name,
    address1: saved.address1 || emptySender.address1,
    place: saved.place || emptySender.place,
    pin: saved.pin || emptySender.pin,
  };
}

export function saveSender(sender: Sender) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SENDER_KEY, JSON.stringify(sender));
  }
}

export function loadGeneratedCount(): number {
  if (typeof window === "undefined") return 0;
  return Number.parseInt(window.localStorage.getItem(GENERATED_KEY) || "0", 10) || 0;
}

export function saveGeneratedCount(count: number) {
  if (typeof window !== "undefined") window.localStorage.setItem(GENERATED_KEY, String(count));
}
