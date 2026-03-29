# Link item: URL input + thumbnail on click

## What you want

When the **Link** element is clicked:
1. Show a **line (input)** where the user can paste or type a URL.
2. Show a **thumbnail** for that link (preview image) next to or below the input.

---

## 1. Data model for link items

Ensure your link item type stores at least:
- `content` or `label` (e.g. "Link" or custom text)
- `url` or `href` (the pasted link)
- Optional: `thumbnailUrl` (cached preview image URL so you don’t refetch every time)

Example shape:

```ts
interface LinkItem {
  id: string;
  type: 'link';
  // ... x, y, w, h, etc.
  content: string;        // display text e.g. "Link"
  url?: string;           // the actual URL
  thumbnailUrl?: string;  // optional cached OG image or favicon
}
```

---

## 2. Click behavior: show URL input + thumbnail

When the user **clicks** the link div (the one with `bg-blue-50`, "Link" text):

- **Option A – Popover / dropdown**: Open a small popover attached to the link item containing:
  - A text input for the URL (pre-filled if `item.url` exists).
  - A thumbnail area: image if you have a URL (or placeholder until URL is entered).
- **Option B – Inline**: Replace or expand the link div to show the input and thumbnail inline on the canvas.
- **Option C – Right sidebar / inspector**: When the link is selected, show in the existing inspector panel:
  - URL input field.
  - Thumbnail preview below it.

Recommended: **Popover** so the canvas isn’t cluttered and the flow is clear.

Example structure:

```tsx
<Popover open={linkPopoverOpen} onOpenChange={setLinkPopoverOpen}>
  <PopoverTrigger asChild>
    <div
      className="w-full h-full rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center truncate px-2 cursor-pointer"
      style={{ color: 'rgb(29, 78, 216)' }}
      onClick={(e) => {
        e.stopPropagation();
        setLinkPopoverOpen(true);
      }}
    >
      {item.content || 'Link'}
    </div>
  </PopoverTrigger>
  <PopoverContent className="w-80" align="start">
    <div className="space-y-3">
      <Label>URL</Label>
      <Input
        placeholder="Paste link here"
        value={item.url ?? ''}
        onChange={(e) => onUpdateItem({ ...item, url: e.target.value })}
      />
      {item.url && (
        <div className="space-y-1">
          <Label>Preview</Label>
          <LinkThumbnail url={item.url} thumbnailUrl={item.thumbnailUrl} onThumbnailLoad={(url) => onUpdateItem({ ...item, thumbnailUrl: url })} />
        </div>
      )}
    </div>
  </PopoverContent>
</Popover>
```

Use your existing `onUpdateItem` so the URL (and optionally `thumbnailUrl`) is saved on the link item.

---

## 3. Thumbnail for the link

You need a preview image for a given URL. Common approaches:

**A. Favicon only (simplest)**  
- Use a favicon service, e.g. `https://www.google.com/s2/favicons?domain=example.com&sz=64`.  
- Parse the pasted URL to get the domain, then set `thumbnailUrl` to that favicon URL (or display it in a small `<img>`).

**B. Open Graph image**  
- Call a small backend or edge function that fetches the URL and returns `og:image` (or meta thumbnail).  
- Or use a third-party link-preview API (e.g. Microlink, LinkPreview) and show the image they return.  
- Store the result in `thumbnailUrl` so you can show it in the popover and on the card.

**C. In-browser only (no backend)**  
- Use a link-preview API that allows CORS (e.g. JSONP or an API that returns image URL).  
- Or start with **favicon only** so you don’t need a backend; add OG image later if you add a small proxy.

Example **LinkThumbnail** component (favicon + optional cached OG image):

```tsx
function LinkThumbnail({ url, thumbnailUrl, onThumbnailLoad }: { url: string; thumbnailUrl?: string; onThumbnailLoad?: (url: string) => void }) {
  try {
    const domain = new URL(url).hostname;
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  } catch {
    return null;
  }
  return (
    <div className="flex items-center gap-2 rounded border p-2">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="h-16 w-24 object-cover rounded" />
      ) : (
        <img src={faviconUrl} alt="" className="h-8 w-8" />
      )}
      <span className="text-xs truncate flex-1">{url}</span>
    </div>
  );
}
```

If you later fetch an OG image, set it with `onThumbnailLoad(ogImageUrl)` and save to `item.thumbnailUrl`.

---

## 4. Where to implement

- **InspiredCanvas** (or wherever link items are rendered):  
  - Wrap the link div in a `Popover` (or use inline form / inspector).  
  - On click: open the popover and show URL input + thumbnail.  
  - Use `onUpdateItem` to persist `url` and optionally `thumbnailUrl`.
- **Link item type**: Add `url` and `thumbnailUrl` if not already there.
- Optional: Reuse the same URL + thumbnail UI in the **right sidebar** when a link item is selected, so users can edit the link there too.

---

## 5. Summary

| Requirement | Implementation |
|------------|----------------|
| Line to paste link | Input field in a popover (or inspector) bound to `item.url` and `onUpdateItem`. |
| Thumbnail for link | Show a small preview: favicon from domain and/or OG image; optional `thumbnailUrl` on the item. |
| On Link click | Open popover (or focus inspector) with URL input and thumbnail area. |

If you paste the component that renders the link div (the one with `bg-blue-50` and "Link"), I can adapt this into exact code for your file.
