/** Square Web Payments SDK — shared loader with deduped script fetch. */

export const SQUARE_SCRIPT_URL = "https://web.squarecdn.com/v1/square.js";

let loadPromise: Promise<void> | null = null;

export function isSquareClientConfigured(): boolean {
  const applicationId = (import.meta.env.VITE_SQUARE_APPLICATION_ID || "").trim();
  const locationId = (import.meta.env.VITE_SQUARE_LOCATION_ID || "").trim();
  return Boolean(applicationId && locationId);
}

export function getSquareClientIds(): { applicationId: string; locationId: string } {
  return {
    applicationId: (import.meta.env.VITE_SQUARE_APPLICATION_ID || "").trim(),
    locationId: (import.meta.env.VITE_SQUARE_LOCATION_ID || "").trim(),
  };
}

/** Start downloading square.js early (booking page, payment route, etc.). */
export function preloadSquarePaymentsSdk(): void {
  if (!isSquareClientConfigured() || typeof document === "undefined") return;
  void loadSquarePaymentsSdk();
}

export function loadSquarePaymentsSdk(): Promise<void> {
  if (typeof window !== "undefined" && window.Square) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SQUARE_SCRIPT_URL}"]`);
    if (existing) {
      if (window.Square) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => {
          loadPromise = null;
          reject(new Error("Square SDK failed to load"));
        },
        { once: true },
      );
      return;
    }

    if (!document.querySelector('link[rel="preconnect"][href="https://web.squarecdn.com"]')) {
      const preconnect = document.createElement("link");
      preconnect.rel = "preconnect";
      preconnect.href = "https://web.squarecdn.com";
      preconnect.crossOrigin = "anonymous";
      document.head.appendChild(preconnect);
    }

    const script = document.createElement("script");
    script.src = SQUARE_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loadPromise = null;
      reject(new Error("Square SDK failed to load"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}
