# Remove duplicate Note tool button

## What to do

Delete the **duplicate** tool button that does the same thing as the **Note** tool. The duplicate is in the tool strip (the bar with `bg-[#0b0b0c] border-b border-white/10`) and has:

- A **button** with `draggable="true"`, `cursor-grab`, `w-9 h-9 rounded-lg`, `text-white/60`, `hover:bg-white/10`
- Rendered as **Primitive.button.SlotClone** (Radix slot wrapper)

Keep a single **Note** tool; remove the extra button that adds the same “note” behavior so the strip doesn’t show two identical actions.

---

## Where to change

1. Open the component that renders the **tool strip** (the row of tool buttons for the Get Inspired board – same file that has the “Drag to whiteboard” / tool-specific tooltips).
2. Find where the tools are listed (e.g. an array of tool configs or a series of `<Tooltip><TooltipTrigger><button>…` blocks).
3. Identify which entry corresponds to this duplicate:
   - It’s the one that creates a **note** (or sticky) item on the board, same as the existing Note tool.
   - In the DOM it’s the button with the classes above; in code it might be a second `type: 'note'` or a separate “Sticky”/“Note” entry.
4. **Remove** that duplicate entry (or the second `<Tooltip>…</Tooltip>` block for the same tool).
5. Save and confirm the strip only has one Note-style button.

---

## Checklist

- [ ] Only one button adds a note/sticky to the board.
- [ ] No duplicate icon or label for the same action.
- [ ] Tooltips and drag behavior still work for the remaining Note tool.

If you paste the file path or the snippet where the tool strip buttons are defined, I can point to the exact block to delete.
