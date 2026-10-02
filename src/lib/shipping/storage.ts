import { emptySender, type Sender } from "./types";

const GENERATED_KEY = "zawiya.generatedCount";
const ORDER_SEQ_KEY = "zawiya.orderSeq";
const BOOKS_KEY = "zawiya.books";
const POSTS_KEY = "zawiya.posts";
const ORDERS_KEY = "zawiya.orders";
const SELECTED_KEY = "zawiya.selected";
const DRAFT_KEY = "zawiya.draft";

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

export const DEFAULT_BOOK = "Hirayil ninnu hridayathilek";
export const DEFAULT_POST = "India Post";

export function loadBooks(): string[] {
  if (typeof window === "undefined") return [DEFAULT_BOOK];
  try {
    const raw = window.localStorage.getItem(BOOKS_KEY);
    const books = raw ? (JSON.parse(raw) as string[]) : [];
    return books.includes(DEFAULT_BOOK) || books.length > 0 ? books : [DEFAULT_BOOK];
  } catch {
    return [DEFAULT_BOOK];
  }
}

export function saveBooks(books: string[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export function loadPosts(): string[] {
  if (typeof window === "undefined") return [DEFAULT_POST];
  try {
    const raw = window.localStorage.getItem(POSTS_KEY);
    const posts = raw ? (JSON.parse(raw) as string[]) : [];
    return posts.includes(DEFAULT_POST) || posts.length > 0 ? posts : [DEFAULT_POST];
  } catch {
    return [DEFAULT_POST];
  }
}

export function savePosts(posts: string[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

export function loadOrders<T>(): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(ORDERS_KEY) || "[]") as T[];
  } catch {
    return [];
  }
}

export function saveOrders(orders: unknown[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export function loadSelected(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(SELECTED_KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

export function saveSelected(ids: string[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(SELECTED_KEY, JSON.stringify(ids));
}

export function loadDraft<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: unknown) {
  if (typeof window !== "undefined") window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
}

const HISTORY_KEY = "zawiya.history";

export type LabelBatch<T> = { id: string; createdAt: string; orders: T[] };

export function loadHistory<T>(): LabelBatch<T>[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(HISTORY_KEY) || "[]") as LabelBatch<T>[];
  } catch {
    return [];
  }
}

export function saveHistory(batches: unknown[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(HISTORY_KEY, JSON.stringify(batches));
}
