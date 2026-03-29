# Get Inspired: Tool Buttons (Click/Drag to Board) + Selection Editing Tools

## Goal

1. **Tool strip buttons**: When **clicked** → add that element type to the board at a default position. When **dragged** onto the canvas → add at drop position.
2. **Board items**: When an item on the board is **clicked** (selected), show **editing tools** (floating toolbar or panel) so users can edit that element easily.

---

## 1. Click and drag to add to board

### Tool button (tool strip)

- Give each tool button a **data attribute** for the tool type (e.g. `data-tool="note"`, `data-tool="shape"`).
- **Click**: `onClick` → call something like `onAddItem(toolType)` so the parent adds a new item at a default position (e.g. center or staggered).
- **Drag**:  
  - `draggable={true}`  
  - `onDragStart={(e) => { e.dataTransfer.setData('application/x-tool-type', toolType); e.dataTransfer.effectAllowed = 'copy'; }}`  
  - Optional: use a drag preview (e.g. small ghost div) so the user sees what they’re dropping.

### Canvas / board

- On the canvas container:  
  - `onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}`  
  - `onDrop={(e) => { e.preventDefault(); const toolType = e.dataTransfer.getData('application/x-tool-type'); const x = e.clientX - canvasRect.left; const y = e.clientY - canvasRect.top; onAddItemAt(toolType, x, y); }}`  
- Use the canvas’s bounding rect (e.g. from a ref) so drop coordinates are in canvas space.

### Parent (page/layout)

- Implement:
  - `onAddItem(toolType)` → add item at default position (e.g. `getDropOffset()`).
  - `onAddItemAt(toolType, x, y)` → add item at `(x, y)`.
- Both should create the correct board item (note, shape, etc.) and call your existing `setItems([...items, newItem])` (or equivalent).

---

## 2. Selection and editing tools

### Selecting an item

- When the user clicks a board item, call your existing `onSelect(id)` (or set selected id in state).
- Ensure the canvas (or item renderer) passes through click and stops propagation so the board receives the click and can set the selected item id.

### Showing editing tools when something is selected

- If `selectedId` is set, render a **floating editing toolbar** (or use the existing right-side inspector and make it more prominent).
- **Placement**:  
  - **Option A**: Near the selected item (e.g. above or below, or to the side). Compute position from the selected item’s bounds (you already have item position/size).  
  - **Option B**: Fixed bar at top/bottom of the canvas (e.g. “Edit: Note” with controls).
- **Content**: Depending on item type, show:
  - **Note/Text**: font family, size, color, bold/italic, alignment.
  - **Shape**: fill color, stroke, shape type.
  - **Image**: replace, link, size.
- Reuse your existing **InspiredInspector** (or similar) fields; the key is to show them in a **floating toolbar** when an item is selected so editing is obvious and easy.

### Implementation sketch (floating toolbar)

```tsx
// When selectedId is set and we have the selected item's bounds:
{selectedItem && (
  <div
    className="absolute z-50 flex items-center gap-2 rounded-lg border bg-[#1a1a1b] p-2 shadow-lg"
    style={{
      left: selectedItem.x,
      top: selectedItem.y - 40, // above the item
    }}
  >
    {/* e.g. font selector, color picker, bold/italic for notes */}
    <Select value={font} onValueChange={...}>...</Select>
    <Button size="icon" variant="ghost">B</Button>
    ...
  </div>
)}
```

- Update the selected item when the user changes these controls (call your existing `onUpdateItem(updatedItem)`).

---

## 3. File locations to update (when you have the repo)

- **Tool strip** (the bar with the draggable buttons, e.g. `InspiredToolStrip.tsx` or wherever `Primitive.button.SlotClone` / the grab buttons live):  
  - Add `onClick` → add to board at default position.  
  - Add `draggable`, `onDragStart` with `application/x-tool-type`.
- **Canvas** (the main whiteboard div that contains the items):  
  - Add `onDragOver` (preventDefault, dropEffect) and `onDrop` (get tool type and coordinates, call `onAddItemAt`).
- **Page/layout** (e.g. `GetInspiredPage.tsx` or the component that holds tool strip + canvas):  
  - Implement `onAddItem(toolType)` and `onAddItemAt(toolType, x, y)` and pass them down.
- **Selection + editing**:  
  - Where you already handle `selectedId` and `onUpdateItem`, add a floating (or fixed) “editing tools” UI that only renders when `selectedId` is set and that uses the selected item’s type and bounds to show the right controls.

---

## 4. Summary

| Action | Result |
|--------|--------|
| **Click** tool strip button | Add that element type to the board at default position. |
| **Drag** tool strip button onto canvas | Add that element at drop coordinates. |
| **Click** item on board | Select it and show editing tools (floating or fixed). |
| Use editing tools | Update the selected item (font, color, etc.) via existing `onUpdateItem`. |

If you can open the exact file that contains the toolbar (the one with the button at `top=156px, left=224px` and `SlotClone`) and the canvas component in your editor, I can give you concrete patches for that file and the canvas next.
