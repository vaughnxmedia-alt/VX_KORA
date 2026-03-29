import type { Board } from "./types";

const STORAGE_KEY = "kora-inspired-boards";

export function loadBoards(): Board[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Board[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveBoards(boards: Board[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  } catch {
    // ignore
  }
}
