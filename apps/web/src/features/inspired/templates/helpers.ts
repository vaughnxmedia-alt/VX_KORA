import type { BoardItem } from "../types";
import {
  DEFAULT_COLUMN_WIDTH,
  DEFAULT_COLUMN_HEIGHT,
  DEFAULT_NOTE_WIDTH,
  DEFAULT_NOTE_HEIGHT,
} from "../types";

const COLUMN_GAP = 24;
const NOTE_GAP = 12;
const PADDING = 20;

/** Generate a stable id for template items. */
export function templateId(boardId: string, prefix: string, index: number): string {
  return `t-${boardId.slice(-8)}-${prefix}-${index}`;
}

function now(): string {
  return new Date().toISOString();
}

/** Create a column at (x, y) with title. */
export function createColumn(
  boardId: string,
  title: string,
  x: number,
  y: number,
  index: number
): BoardItem {
  return {
    id: templateId(boardId, "col", index),
    type: "column",
    x,
    y,
    w: DEFAULT_COLUMN_WIDTH,
    h: DEFAULT_COLUMN_HEIGHT,
    content: title,
    createdAt: now(),
    updatedAt: now(),
  };
}

/** Create a note inside a column's logical area (position in board space). */
export function createNote(
  boardId: string,
  content: string,
  x: number,
  y: number,
  index: number
): BoardItem {
  return {
    id: templateId(boardId, "note", index),
    type: "note",
    x,
    y,
    w: DEFAULT_NOTE_WIDTH,
    h: DEFAULT_NOTE_HEIGHT,
    content,
    createdAt: now(),
    updatedAt: now(),
  };
}

/** Create a text block. */
export function createText(
  boardId: string,
  content: string,
  x: number,
  y: number,
  w: number,
  h: number,
  index: number
): BoardItem {
  return {
    id: templateId(boardId, "text", index),
    type: "text",
    x,
    y,
    w,
    h,
    content,
    createdAt: now(),
    updatedAt: now(),
  };
}

/** Layout: row of columns with notes inside. Returns items in order: columns first, then notes. */
export function layoutColumnsWithNotes(
  boardId: string,
  columnSpecs: { title: string; prompts: string[] }[]
): BoardItem[] {
  const items: BoardItem[] = [];
  let itemIndex = 0;
  let x = PADDING;

  for (const col of columnSpecs) {
    items.push(createColumn(boardId, col.title, x, PADDING, itemIndex++));
    let noteY = PADDING + 48 + NOTE_GAP;
    for (const prompt of col.prompts) {
      items.push(createNote(boardId, prompt, x + PADDING, noteY, itemIndex++));
      noteY += DEFAULT_NOTE_HEIGHT + NOTE_GAP;
    }
    x += DEFAULT_COLUMN_WIDTH + COLUMN_GAP;
  }

  return items;
}
