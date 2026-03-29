# Note element: click-to-write + border / border color options

## What you want

1. **Click and write**: When the note is clicked, the user can type in the textarea (focus and edit).
2. **Border options**: Ability to add a border and change border color on the note card.

---

## 1. Click to write (textarea focus)

- **Problem**: Clicks might be captured by the card wrapper for “select item” and never reach the textarea, or the textarea might not be focused.
- **Fix**:
  - On the **card wrapper** (the `div` with `bg-amber-50` / `border-amber-200/80`), handle click so that:
    - If the click target is **inside the textarea** (or the textarea itself), **don’t** change selection; let the event reach the textarea so it can focus and the user can type.
    - If the click is on the **card but not the textarea** (e.g. padding area), then select the item and optionally focus the textarea so they can type right away.
  - In code: either **stopPropagation** on the textarea’s click so the canvas doesn’t treat it as “select item only”, or in the card’s **onClick** check `event.target`: if it’s the textarea (or a child of it), focus the textarea and optionally prevent the canvas from doing something else (e.g. deselecting).

Example pattern for the **note card**:

```tsx
// On the outer note div (card wrapper):
onClick={(e) => {
  const isTextarea = (e.target as HTMLElement).closest('textarea');
  if (isTextarea) {
    (e.target as HTMLTextAreaElement).focus();
    e.stopPropagation(); // so canvas doesn’t “steal” the click
  } else {
    onSelect(item.id);
    // optional: focus the textarea so user can type immediately
    setTimeout(() => textareaRef.current?.focus(), 0);
  }
}}
```

- Ensure the **textarea** is not `readOnly` and doesn’t have `pointer-events: none`. It should be the one that receives typing.

---

## 2. Data model: border and border color for notes

Add optional fields to your **note item** type (the one that has `content`, `type: 'note'`, etc.), for example:

```ts
// Example addition to your note/item type
borderWidth?: number;  // 0 = none, 1 = thin, 2 = medium, etc.
borderColor?: string;  // e.g. "#0b0b0c", "amber-200", or a Tailwind class
```

- When rendering the note card, use these when present:
  - **Border**: e.g. `borderWidth === 0` → no border; otherwise `border-[${borderWidth}px]` or map to Tailwind `border`, `border-2`, etc.
  - **Border color**: use `borderColor` in `style={{ borderColor: borderColor }}` or map to a Tailwind class like `border-amber-200`, `border-gray-400`, etc.

---

## 3. Rendering the note card with border options

Use the item’s `borderWidth` and `borderColor` on the **outer div** (the one that’s `bg-amber-50` and currently has `border border-amber-200/80`):

```tsx
// Example: note card wrapper
<div
  className={cn(
    "w-full h-full rounded-lg p-3 overflow-hidden",
    "bg-amber-50",
    item.borderWidth === 0 || item.borderWidth == null ? "border-0" : "border"
  )}
  style={{
    borderWidth: item.borderWidth ?? 1,
    borderColor: item.borderColor ?? "rgb(253 230 138 / 0.8)", // amber-200/80
  }}
>
  <textarea
    ref={textareaRef}
    className="w-full h-full resize-none bg-transparent placeholder:text-amber-600/50 border-none outline-none"
    placeholder="Write a note..."
    value={item.content}
    onChange={(e) => onUpdateItem({ ...item, content: e.target.value })}
    onBlur={...}
    onClick={(e) => e.stopPropagation()}
  />
</div>
```

- So: **clicking the textarea** focuses it and allows typing; **border** and **border color** come from the item.

---

## 4. Inspector / editing tools: add border and border color controls

Where you already show the selected item’s properties (e.g. **InspiredInspector** or right sidebar when a note is selected), add:

- **Border**
  - Control: “Border” with options e.g. “None”, “Thin (1px)”, “Medium (2px)”, “Thick (4px)”.
  - Map to `borderWidth`: 0, 1, 2, 4 (or whatever you use in the data model).
  - On change: `onUpdateItem({ ...selectedItem, borderWidth: value })`.

- **Border color**
  - Control: color picker or a small set of presets (e.g. black, gray, amber, blue).
  - Store as hex or a key that you map to a color (e.g. `borderColor: "#0b0b0c"` or `"amber-200"`).
  - On change: `onUpdateItem({ ...selectedItem, borderColor: value })`.

Example inspector snippet:

```tsx
{selectedItem?.type === 'note' && (
  <>
    <Label>Border</Label>
    <Select
      value={String(selectedItem.borderWidth ?? 1)}
      onValueChange={(v) => onUpdateItem({
        ...selectedItem,
        borderWidth: Number(v),
      })}
    >
      <SelectItem value="0">None</SelectItem>
      <SelectItem value="1">Thin (1px)</SelectItem>
      <SelectItem value="2">Medium (2px)</SelectItem>
      <SelectItem value="4">Thick (4px)</SelectItem>
    </Select>
    <Label>Border color</Label>
    <div className="flex gap-2">
      {['#0b0b0c', '#fcd34d', '#94a3b8', '#000'].map((color) => (
        <button
          key={color}
          type="button"
          className="w-6 h-6 rounded border"
          style={{ backgroundColor: color }}
          onClick={() => onUpdateItem({
            ...selectedItem,
            borderColor: color,
          })}
        />
      ))}
    </div>
  </>
)}
```

---

## 5. Summary

| Requirement              | Implementation |
|--------------------------|----------------|
| Click note and write     | Don’t let canvas “eat” textarea clicks; use `stopPropagation` on textarea and/or focus textarea when card is clicked. |
| Add a border             | Add `borderWidth` to note item; render it on the card; add “Border” control in inspector. |
| Change border color      | Add `borderColor` to note item; use it in `style` (or class) on the card; add “Border color” control in inspector. |

Apply these in:

1. The **InspiredCanvas** (or wherever the note card + textarea are rendered): click handling and border/borderColor on the card.
2. The **note item type**: `borderWidth` and `borderColor`.
3. The **inspector** for the selected note: “Border” and “Border color” controls that call `onUpdateItem`.

If you can open the file that renders the note (the div with `bg-amber-50` and the “Write a note...” textarea) and the inspector component in your editor, I can give you exact patches for those files.
