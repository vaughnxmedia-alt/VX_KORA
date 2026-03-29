# Column UI + formatting toolbar (design spec)

## What you want

1. **Column card** (as in your first screenshot):
   - Editable title at top (e.g. "New Column")
   - Subtitle showing count (e.g. "1 card")
   - Main content area with placeholder "Start typing..." and a clear input/editor
   - Optional drag handle (small circle) in the top-right of the content area

2. **Formatting toolbar** (vertical strip, as in your second screenshot) with these tools:
   - **Text style** – Font, size, color (T with color indicator)
   - **Bold** (B)
   - **Italic** (I)
   - **Strikethrough** (S)
   - **Underline** (U)
   - **Bulleted list**
   - **Numbered list**
   - **Alignment / block** (e.g. center or block formatting)
   - **Code block** (`</>`)
   - **Link** (chain icon)
   - **Comment / note** (speech bubble with +)

The toolbar should appear in context (e.g. when the column content is focused or when text is selected) so users can format and add lists, links, and notes without leaving the board.

---

## 1. Column card layout

```text
┌─────────────────────────────────────┐
│  New Column                    (○)  │  ← Title (click to edit) + optional drag handle
│  1 card                             │  ← Subtitle (count)
├─────────────────────────────────────┤
│  Start typing...                    │  ← Content area (input or rich editor)
│                                     │
│                                     │
└─────────────────────────────────────┘
```

- **Title**: Click to edit inline; Enter to save (as in your previous column spec). Store as `columnTitle` (default "New Column").
- **Subtitle**: Derived from content (e.g. number of cards/blocks). Update when items are added/removed.
- **Content area**: Single focused input or rich-text area. Placeholder: "Start typing...". Optional small circle in the top-right of this area as a drag handle for the whole column or for reordering.

---

## 2. Formatting toolbar – tool list

| # | Tool           | Icon description        | Action |
|---|----------------|--------------------------|--------|
| 1 | Text style     | T with color/rainbow     | Open font/size/color picker or dropdown |
| 2 | Bold           | B                        | Toggle bold |
| 3 | Italic         | I                        | Toggle italic |
| 4 | Strikethrough  | S with line              | Toggle strikethrough |
| 5 | Underline      | U with underscore        | Toggle underline |
| 6 | Bulleted list  | Lines with bullets       | Insert or toggle bullet list |
| 7 | Numbered list  | Lines with 1, 2          | Insert or toggle numbered list |
| 8 | Alignment/block| Three centered lines     | Alignment (e.g. left/center/right) or block |
| 9 | Code block     | `</>`                    | Insert or wrap in code block |
|10 | Link           | Chain                    | Insert link or wrap selection (paste URL + optional thumbnail) |
|11 | Comment/note   | Speech bubble + plus     | Add comment/note or new text block |

- Toolbar: **vertical strip**, light gray background, dark gray icons, labels under each (e.g. "Text style", "Bold", …).
- Show when: content area is **focused** or **text is selected** (e.g. floating beside selection or fixed beside the column).

---

## 3. Implementation options

**A. Rich text editor (recommended for full formatting)**  
- Use a library (e.g. **TipTap**, **Lexical**, **Slate**, or **Plate**) inside the column content area.
- Wire the toolbar buttons to the editor’s commands (bold, italic, lists, code block, link, etc.).
- “Text style” opens a small popover for font/size/color.
- “Comment/note” can insert a comment node or a separate note block.
- Store column content as HTML or JSON (depending on the editor) on the column item.

**B. contentEditable + execCommand**  
- Column content = one `contentEditable` div with placeholder "Start typing...".
- Toolbar buttons call `document.execCommand('bold')`, `insertUnorderedList`, `createLink`, etc.
- Simpler but less control and deprecated in some environments. Good for a quick prototype.

**C. Hybrid**  
- Column content = simple blocks (paragraph, list, code, image, file). Each block has a type and content.
- Toolbar “Text style” applies to the current block or selection; list/code/link tools insert or convert blocks.
- “Comment/note” adds a note block. Store blocks as JSON on the column item.

---

## 4. Data model (column)

- `columnTitle: string` (e.g. "New Column")
- `content` or `blocks`: either:
  - **Rich**: HTML or editor JSON (if using TipTap/Lexical/Slate), or
  - **Structured**: `blocks: Array<{ type: 'paragraph'|'bulletList'|'orderedList'|'code'|'link'|'note'|'image'|'file', ... }>`
- Subtitle "X card(s)" can be computed (e.g. number of card-like blocks or child items).

---

## 5. Where to implement

- **Column component** (on the board): Renders the card with title, subtitle, and content area. Content area = rich text editor or contentEditable with placeholder "Start typing...". Optional drag handle on the content box.
- **Formatting toolbar component**: Vertical strip with the 11 tools above. Shown when the column’s content area is focused (or when selection is inside it). Position: floating near the selection or fixed to the left/right of the column.
- **Get Inspired / board**: Ensure the column is a first-class item type; toolbar is rendered by the same layout that renders the canvas (so it appears on the board, not in the sidebar).

---

## 6. Assets / icons

- Reuse existing icon set (e.g. **Lucide**: `Type`, `Bold`, `Italic`, `Strikethrough`, `Underline`, `List`, `ListOrdered`, `AlignCenter` or similar, `Code`, `Link`, `MessageSquarePlus` or `StickyNote`) to match the described tools.
- “Text style” can use a **T** with a small color dot or rainbow circle (custom or icon + badge).

If you tell me which stack you use (e.g. TipTap vs contentEditable) and where the column is rendered (file path), I can outline exact components and props for this column + toolbar.
