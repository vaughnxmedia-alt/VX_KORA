# Text box element: no border, Montserrat Bold default, click to edit

## What you want

1. **No border** on the text box (remove ring/border from the wrapper).
2. **Default font**: Montserrat Bold.
3. **Click to edit**: Clicking the text box should allow typing/editing.

---

## 1. Remove the border

The wrapper currently has something like:
- `ring-1 ring-[#0b0b0c]/30` or `border-2 border-[#0b0b0c]`

**Change:** On the text box **wrapper** div (the one that’s `absolute ... select-none` with the ring), remove border/ring classes so it’s borderless:

- Remove: `ring-1`, `ring-[#0b0b0c]/30`, and any `border-*` classes from that wrapper.
- Use e.g. `border-0` and no `ring-*` so the text box has no visible border.

Example:

```tsx
// Before (with border/ring):
className="absolute ... ring-1 ring-[#0b0b0c]/30 ..."

// After (no border):
className="absolute ... border-0 ring-0 ..."
// or simply omit ring and border classes
```

---

## 2. Default font: Montserrat Bold

**Option A – Tailwind**

- Add the Montserrat font (e.g. in your HTML or layout) if not already there:

```html
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&display=swap" rel="stylesheet" />
```

- On the **inner text box div** (the one with `bg-transparent p-1 min-h-[1em]`), set:

```tsx
className="... font-montserrat font-bold"
```

- In Tailwind config, add Montserrat if needed:

```js
// tailwind.config.js
theme: {
  extend: {
    fontFamily: {
      montserrat: ['Montserrat', 'sans-serif'],
    },
  },
},
```

**Option B – Inline style**

- On the same inner div:

```tsx
style={{
  fontFamily: '"Montserrat", sans-serif',
  fontWeight: 700,
  ...(existingStyle),
}}
```

Use the same for the **default** when creating new text items (e.g. in the type or factory: `fontFamily: 'Montserrat'`, `fontWeight: 700`).

---

## 3. Click to edit

- If the text box is a **div** (contenteditable): ensure it has `contentEditable={true}` and that clicks don’t get consumed by the canvas “select item” logic. On the div’s `onClick`, call `e.stopPropagation()` so the canvas doesn’t steal the click, and optionally call `el.focus()`.
- If it’s a **textarea** or **input**: same idea — `onClick={(e) => e.stopPropagation()}` and ensure the element can receive focus (no `readOnly` / `disabled`). When the user clicks the wrapper, you can call `inputRef.current?.focus()` so they can edit immediately.

Example (contenteditable div):

```tsx
<div
  contentEditable
  suppressContentEditableWarning
  className="w-full h-full bg-transparent p-1 min-h-[1em] overflow-hidden outline-none"
  style={{ fontFamily: 'Montserrat', fontWeight: 700, color: 'rgb(11, 11, 12)' }}
  onClick={(e) => e.stopPropagation()}
  onBlur={(e) => onUpdateItem({ ...item, content: e.currentTarget.innerText })}
  ...
>
  {item.content}
</div>
```

Example (textarea):

```tsx
<textarea
  className="w-full h-full bg-transparent p-1 min-h-[1em] resize-none border-0 outline-none"
  style={{ fontFamily: 'Montserrat', fontWeight: 700 }}
  value={item.content}
  onChange={(e) => onUpdateItem({ ...item, content: e.target.value })}
  onClick={(e) => e.stopPropagation()}
/>
```

---

## 4. Summary

| Requirement      | What to do |
|------------------|------------|
| No border        | Remove `ring-1`, `ring-[#0b0b0c]/30`, and any `border-*` from the text box wrapper. |
| Montserrat Bold  | Add Montserrat font; set `fontFamily: 'Montserrat'` and `fontWeight: 700` (or `font-montserrat font-bold`) on the text box. |
| Click to edit    | Use `onClick={(e) => e.stopPropagation()}` on the editable element; ensure it’s focusable (contentEditable or input/textarea). |

Apply these in the **InspiredCanvas** (or wherever this text box item is rendered): same component that currently has the div with `bg-transparent p-1 min-h-[1em]` and the wrapper with `ring-1 ring-[#0b0b0c]/30`.
