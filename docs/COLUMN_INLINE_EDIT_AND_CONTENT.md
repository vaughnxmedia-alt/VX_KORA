# Column: inline edit on board + lists, images, sections, files in bottom area

## What you want

1. **No sidebar editing** – Don’t edit the column in the side panel; do everything on the board.
2. **Column title on the board** – Click the “Column” placeholder (the header bar) to edit it inline. Type the title; **Enter** saves it. Clicking the title again lets you change it, then **Enter** to save again.
3. **Bottom section** – The area below the header should support:
   - **Lists**
   - **Images**
   - **Sectioning** (dividers / sub-sections)
   - **Files**

---

## 1. Column title: click to edit, Enter to save

- **Display mode**: Show the current title (or “Column” if empty) in the header div (`px-3 py-2 border-b border-slate-300 bg-slate-200/80 font-medium`).
- **Click header**: Switch to “edit mode” – e.g. replace the label with an `<input>` or `contentEditable` div, focus it, and pre-fill the current title.
- **Enter**: On key down **Enter**, save the title (call `onUpdateItem({ ...columnItem, columnTitle: value })` or whatever field holds the title), then leave edit mode (show label again).
- **Click title again**: Same as first time – enter edit mode, focus, then Enter to save.

Implementation sketch:

```tsx
const [editingTitle, setEditingTitle] = useState(false);
const [titleValue, setTitleValue] = useState(columnItem.columnTitle ?? 'Column');
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  if (editingTitle) inputRef.current?.focus();
}, [editingTitle]);

const saveTitle = () => {
  const trimmed = titleValue.trim() || 'Column';
  onUpdateItem({ ...columnItem, columnTitle: trimmed });
  setTitleValue(trimmed);
  setEditingTitle(false);
};

// Header (on board):
<div
  className="px-3 py-2 border-b border-slate-300 bg-slate-200/80 font-medium truncate cursor-text"
  onClick={(e) => {
    e.stopPropagation();
    setEditingTitle(true);
  }}
>
  {editingTitle ? (
    <input
      ref={inputRef}
      type="text"
      value={titleValue}
      onChange={(e) => setTitleValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') saveTitle();
      }}
      onBlur={saveTitle}
      onClick={(e) => e.stopPropagation()}
      className="w-full bg-transparent outline-none font-medium"
    />
  ) : (
    <span className="truncate">{columnItem.columnTitle || 'Column'}</span>
  )}
</div>
```

- Use **stopPropagation** on the header and input so the canvas doesn’t treat clicks as “select item” in a way that blocks typing.
- Store the title on the column item (e.g. `columnTitle` or `title`) and persist via `onUpdateItem`. No sidebar needed for the title.

---

## 2. Bottom section: lists, images, sections, files

The area below the header should behave as a **content zone** where users can:

- **Lists** – Add list blocks (bullet or numbered); each list item can be a small text line.
- **Images** – Add images (upload or URL).
- **Section things off** – Visual dividers or sub-headers to group content (e.g. “Section A”, “Section B” or a horizontal rule).
- **Files** – Add file attachments (same as your File item: pick file, show name/link).

Ways to implement:

**Option A – Nested items (recommended)**  
- Treat the column as a **container**. The “bottom section” is a drop zone or slot that holds **child items**.
- Data model: column item has `children: string[]` (ids of items that belong to this column) or items have `columnId`/`parentId` pointing to this column.
- When rendering the column, render the header (inline-editable as above), then below it render the list of child items. Each child can be:
  - **List** – a small block type that renders as bullet/numbered lines.
  - **Image** – image block (URL or uploaded).
  - **Section** – divider or sub-header block.
  - **File** – file block (name + link/icon).
- Users **add** these by: toolbar buttons that “add to current column”, or drag-and-drop from the tool strip into the column body, or a small “+” menu inside the column that offers “List”, “Image”, “Section”, “File”.

**Option B – Rich content inside one block**  
- Column item has a rich content field (e.g. blocks or HTML). The bottom section is one editable region that can contain list blocks, image blocks, etc. (like a mini document).  
- More flexible but more complex (block editor, paste handling, etc.).

**Option C – Simple list of blocks**  
- Column has `blocks: Array<{ type: 'list'|'image'|'section'|'file', ... }>`. You render the header (inline edit) and below it iterate over `blocks`, rendering a list view, image, divider/section, or file card.  
- Add/remove/reorder blocks via a small “Add list”, “Add image”, “Add section”, “Add file” UI in the column footer or a floating “+” menu.

Recommended: **Option A or C** so “lists, images, section off, files” are explicit block types inside the column.

---

## 3. UX details

- **Lists**: Each list block can have `items: string[]`. Inline add/edit lines; optional bullet vs numbered.
- **Images**: Same as your existing image item (upload or URL); rendered inside the column body.
- **Sections**: A “section” block can be a horizontal rule, or a small sub-header (e.g. text + line). Click sub-header to edit label, Enter to save (same pattern as column title).
- **Files**: Same as File item: show filename/link; click to replace or open. No sidebar – actions on the board.

Keep all editing **on the board**: no sidebar for column title or for these blocks. Use inline edit + Enter for text, and click/upload for files and images.

---

## 4. Summary

| Requirement | Implementation |
|-------------|----------------|
| Don’t edit in sidebar | All column editing happens in the column on the canvas (inline title, inline block content). |
| Click “Column” placeholder | Header switches to inline input; type then **Enter** to set/save title. Click again to change, Enter to save. |
| Bottom section: lists | Add a “list” block type inside the column; render as bullet/numbered lines; add/edit lines on the board. |
| Bottom section: images | Add “image” blocks inside the column (upload or URL); render thumbnail/link on the board. |
| Bottom section: section off | Add “section” blocks (divider or sub-header); optional inline edit for sub-header label. |
| Bottom section: files | Add “file” blocks inside the column (same as File item); show name/link on the board. |

**Where to implement**

- **InspiredCanvas** (or the component that renders the column):  
  - Column header: click → inline input, Enter → save title (no sidebar).  
  - Column body: render child blocks (list, image, section, file) and provide a way to add them (e.g. “+” menu or drag from tools into the column).

If you share the component that renders the column (the div with “Column” and the slate header), I can adapt this into exact code changes for your repo.
