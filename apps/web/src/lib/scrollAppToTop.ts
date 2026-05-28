/** Scroll the app shell (or window) to the top — use after route/step changes on mobile. */
export function scrollAppToTop(behavior: ScrollBehavior = "instant"): void {
  const main = document.querySelector<HTMLElement>("main[data-app-scroll]");
  if (main && main.classList.contains("overflow-y-auto")) {
    main.scrollTo({ top: 0, left: 0, behavior });
  }
  window.scrollTo({ top: 0, left: 0, behavior });
  document.documentElement.scrollTo({ top: 0, left: 0, behavior });
}

import type { FocusEvent } from "react";

/** Keep focused fields visible when the mobile keyboard opens. */
export function scrollFieldIntoViewOnFocus(event: FocusEvent<HTMLElement>): void {
  const el = event.currentTarget;
  window.setTimeout(() => {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 300);
}
