import { emptySender, type Sender } from "./types";

const GENERATED_KEY = "zawiya.generatedCount";
const ORDER_SEQ_KEY = "zawiya.orderSeq";
const BOOKS_KEY = "zawiya.books";

export function loadSender(): Sender {
  return emptySender;
}

export function loadGeneratedCount(): number {
  if (typeof window === "undefined") return 0;
  return Number.parseInt(window.localStorage.getItem(GENERATED_KEY) || "0", 10) || 0;
}

export function saveGeneratedCount(count: number) {
  if (typeof window !== "undefined") window.localStorage.setItem(GENERATED_KEY, String(count));
}

export function peekOrderSeq(): number {
  if (typeof window === "undefined") return 1;
  return (Number.parseInt(window.localStorage.getItem(ORDER_SEQ_KEY) || "0", 10) || 0) + 1;
}

export function commitOrderSeq(n: number) {
  if (typeof window !== "undefined") window.localStorage.setItem(ORDER_SEQ_KEY, String(n));
}

export function formatOrderId(n: number) {
  return `ZB${String(n).padStart(3, "0")}`;
}

export function loadBooks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : ["Hirayil Ninn Hridayathilekku"];
  } catch {
    return [];
  }
}

export function saveBooks(books: string[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}
