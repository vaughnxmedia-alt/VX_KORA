export const INSPIRED_TOOL = {
  SELECT: "select",
  STICKY_NOTE: "sticky_note",
  TEXT: "text",
  LINK: "link",
  IMAGE: "image",
  SHAPE: "shape",
  PEN: "pen",
  UPLOAD: "upload",
  COLUMN: "column",
  SEARCH: "search",
  AI_ASSIST: "ai_assist",
} as const;

export type InspiredTool = (typeof INSPIRED_TOOL)[keyof typeof INSPIRED_TOOL];

export const DEFAULT_BOARD_NAME = "Master Plan";
