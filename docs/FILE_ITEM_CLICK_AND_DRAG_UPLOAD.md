# File item: click or drag → native file picker only (no popup box)

## What you want

1. **No popup box** – Don’t show a custom modal/dialog for the File element.
2. **When File is clicked** – Open the **native “choose file”** dialog (local files). After the user picks a file, upload it and add it to the board.
3. **When File is dragged** – User drags the file logo onto the board; on **mouse release (drop)**, open the **same native file picker**. After they choose a file, add/upload it to the board at the drop position.

So: **click** or **drop** → only the OS file picker appears → then upload and add to board.

---

## 1. Click: open file picker and add to board

- Use a **hidden** `<input type="file">` in the component that renders the File tool/card.
- When the user **clicks** the File element (the div with "📄 File"), **trigger a click on that hidden input** so the native file dialog opens.
- On `input.onChange` (file selected): run your existing upload logic, then add the uploaded file as a new item on the board (e.g. at a default position or last drop offset).

Example (tool strip or file card):

```tsx
const fileInputRef = useRef<HTMLInputElement>(null);

const handleFileClick = () => {
  fileInputRef.current?.click();
};

const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  // 1. Upload file (your existing upload logic)
  // 2. Add to board at default position, e.g. onAddFileItem(uploadedUrl, file.name, defaultX, defaultY);
};

return (
  <>
    <input
      ref={fileInputRef}
      type="file"
      className="hidden"
      accept="image/*,.pdf,.doc,.docx,.mp4"
      onChange={handleFileSelected}
    />
    <div
      className="w-full h-full rounded-lg bg-white border border-slate-200 p-2 flex flex-col cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        handleFileClick();
      }}
    >
      📄 File
    </div>
  </>
);
```

No custom popup – only the native file dialog.

---

## 2. Drag: drop on board → then open file picker

- Make the **File** element (the logo/card in the tool strip) **draggable**.
- **On drag start**: set drag data so the canvas knows “this is a file drop” (e.g. `application/x-tool-type: file`).
- **On drop on the canvas**:  
  - **Do not** open a custom box.  
  - **Do** programmatically **trigger the same hidden file input** so the native file picker opens.  
  - Store the **drop coordinates** (x, y) in a ref or state.
- When the user **selects a file** in the picker (in the same `handleFileSelected`), use the **stored drop position** to add the uploaded file at that location.

Example flow:

**Tool strip – File is draggable:**

```tsx
<div
  draggable
  onDragStart={(e) => {
    e.dataTransfer.setData('application/x-tool-type', 'file');
    e.dataTransfer.effectAllowed = 'copy';
  }}
  className="..."
>
  📄 File
</div>
```

**Canvas – on drop, open file picker and remember position:**

```tsx
const pendingFileDropRef = useRef<{ x: number; y: number } | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);

const handleCanvasDrop = (e: React.DragEvent) => {
  e.preventDefault();
  const toolType = e.dataTransfer.getData('application/x-tool-type');
  if (toolType !== 'file') return;

  const rect = canvasRef.current?.getBoundingClientRect();
  if (!rect) return;
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  pendingFileDropRef.current = { x, y };
  fileInputRef.current?.click();
};

const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;
  const pos = pendingFileDropRef.current;
  pendingFileDropRef.current = null;

  // Upload file, then add to board at pos (or default if no pos)
  if (pos) {
    addFileItemAt(file, pos.x, pos.y);
  } else {
    addFileItemAtDefaultPosition(file);
  }
};
```

So: **drag File onto board → drop → native file picker opens → user picks file → file is uploaded and placed at drop position**. No extra popup box.

---

## 3. Summary

| Action | Result |
|--------|--------|
| **Click** File (tool or card) | Hidden `<input type="file">` is triggered → native “choose file” dialog → on select: upload and add file to board. |
| **Drag** File onto board and **release** | Store drop (x, y), trigger same file input → native dialog → on select: upload and add file at drop position. |
| **No** custom popup | Only the OS file picker; no modal/dialog box for the File element. |

Implementation points:

- One hidden `<input type="file">` used for both click and drop.
- Click: trigger input, add file at default position after upload.
- Drop: save drop coordinates, trigger input, add file at those coordinates after upload.
- Reuse your existing upload and “add item to board” logic; only the trigger (click vs drop) and the position (default vs drop) differ.

If you share the component that renders the "📄 File" div and the canvas drop handler, I can adapt this into exact patches for your codebase.
