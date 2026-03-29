export type BoardItemType = "note" | "text" | "shape" | "image" | "link" | "column" | "file";

/** Typography for text-capable items (note, text, link, column). */
export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  fontWeight?: string | number;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
}

export interface BoardItemBase {
  id: string;
  type: BoardItemType;
  x: number;
  y: number;
  w: number;
  h: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteItem extends BoardItemBase {
  type: "note";
  content: string;
  textStyle?: TextStyle;
  borderWidth?: number;
  borderColor?: string;
}

export interface TextItem extends BoardItemBase {
  type: "text";
  content: string;
  textStyle?: TextStyle;
}

export interface ShapeItem extends BoardItemBase {
  type: "shape";
  content: string;
}

export interface ImageItem extends BoardItemBase {
  type: "image";
  content: string;
  src?: string;
  /** For pins from Inspiration: sourceUrl, thumbnailUrl, title, summary */
  contentJson?: Record<string, unknown>;
}

export interface LinkItem extends BoardItemBase {
  type: "link";
  content: string;
  url?: string;
  thumbnailUrl?: string;
  textStyle?: TextStyle;
}

export interface ColumnItem extends BoardItemBase {
  type: "column";
  content: string;
  columnTitle?: string;
  textStyle?: TextStyle;
}

export interface FileItem extends BoardItemBase {
  type: "file";
  content: string;
  src?: string;
  filename?: string;
  sizeBytes?: number;
  mimeType?: string;
  assetId?: string;
}

export type BoardItem = NoteItem | TextItem | ShapeItem | ImageItem | LinkItem | ColumnItem | FileItem;

export interface Board {
  id: string;
  name: string;
  items: BoardItem[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_ITEM_WIDTH = 200;
export const DEFAULT_ITEM_HEIGHT = 120;
export const DEFAULT_NOTE_WIDTH = 180;
export const DEFAULT_NOTE_HEIGHT = 140;
export const DEFAULT_TEXT_WIDTH = 240;
export const DEFAULT_TEXT_HEIGHT = 80;
export const DEFAULT_SHAPE_WIDTH = 120;
export const DEFAULT_SHAPE_HEIGHT = 80;
export const DEFAULT_COLUMN_WIDTH = 280;
export const DEFAULT_COLUMN_HEIGHT = 400;
export const DEFAULT_FILE_CARD_WIDTH = 180;
export const DEFAULT_FILE_CARD_HEIGHT = 80;
