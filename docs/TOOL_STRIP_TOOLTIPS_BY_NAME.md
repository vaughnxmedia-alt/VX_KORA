# Tool strip tooltips: tool name + one-sentence description

## What you want

Replace the generic **"Drag to whiteboard"** tooltip with:
1. The **name of each tool**
2. A **one-sentence** line describing what the tool is and how it’s used

---

## Suggested copy per tool

Use this (or adjust wording) in your tool strip. Each tooltip can be **title** = tool name, **description** = one sentence, or combine into a single string.

| Tool   | Name  | One-sentence description |
|--------|--------|----------------------------|
| Note   | **Note** | Sticky note for quick ideas; drag to the board or click to add, then type. |
| Text   | **Text** | Plain text box with no border; drag or click to add, then click to edit. |
| Link   | **Link** | Add a link; click to paste a URL and see a preview thumbnail. |
| File   | **File** | Upload a file from your device; click or drag to the board, then choose a file. |
| Shape  | **Shape** | Add a shape (rectangle, circle, etc.); drag to the board or click to add. |
| Image  | **Image** | Add an image; drag or click to add, then upload or paste a link. |
| Column | **Column** | Layout column for grouping items; drag to the board to add. |

If you have different tools (e.g. "Sticky", "Card", "Drawing"), name them and write one sentence the same way: what it is + how it’s used (drag/click, then what).

---

## Implementation

Where you render each tool button and wrap it in a **Tooltip** (the one that currently shows "Drag to whiteboard"):

- **Option A – Two lines**: Put the tool **name** as the first line (e.g. bold or slightly larger) and the **sentence** as the second line.
- **Option B – One line**: `"{name}. {sentence}"` e.g. `"Note. Sticky note for quick ideas; drag to the board or click to add, then type."`

Example with Radix/shadcn-style Tooltip:

```tsx
const TOOL_TIPS: Record<string, { name: string; description: string }> = {
  note: {
    name: 'Note',
    description: 'Sticky note for quick ideas; drag to the board or click to add, then type.',
  },
  text: {
    name: 'Text',
    description: 'Plain text box with no border; drag or click to add, then click to edit.',
  },
  link: {
    name: 'Link',
    description: 'Add a link; click to paste a URL and see a preview thumbnail.',
  },
  file: {
    name: 'File',
    description: 'Upload a file from your device; click or drag to the board, then choose a file.',
  },
  shape: {
    name: 'Shape',
    description: 'Add a shape (rectangle, circle, etc.); drag to the board or click to add.',
  },
  image: {
    name: 'Image',
    description: 'Add an image; drag or click to add, then upload or paste a link.',
  },
  column: {
    name: 'Column',
    description: 'Layout column for grouping items; drag to the board to add.',
  },
};

// For each tool button:
<Tooltip>
  <TooltipTrigger asChild>
    <button ...>{/* tool icon */}</button>
  </TooltipTrigger>
  <TooltipContent side="bottom" align="center" className="...">
    <p className="font-medium">{TOOL_TIPS[toolType].name}</p>
    <p className="text-xs text-white/70 mt-0.5">{TOOL_TIPS[toolType].description}</p>
  </TooltipContent>
</Tooltip>
```

Or single-line:

```tsx
<TooltipContent>
  {TOOL_TIPS[toolType].name}. {TOOL_TIPS[toolType].description}
</TooltipContent>
```

---

## Where to change it

Find the **tool strip** component that renders the row of tools (the bar with `bg-[#0b0b0c] border-b border-white/10` and the Radix tooltip `data-side="bottom"`). Replace the hardcoded "Drag to whiteboard" (or `title` / tooltip content) with the tool-specific **name + description** from the table above, keyed by tool type (e.g. `note`, `text`, `link`, `file`).

If you paste the file or snippet where that tooltip is set, I can adapt this into exact edits.
