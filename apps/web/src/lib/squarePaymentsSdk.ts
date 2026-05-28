/** Square Web Payments SDK — shared loader with deduped script fetch. */

export const SQUARE_SCRIPT_URL = "https://web.squarecdn.com/v1/square.js";

let loadPromise: Promise<void> | null = null;

function readSquareEnvIds(): { applicationId: string; locationId: string } {
  return {
    applicationId: (import.meta.env.VITE_SQUARE_APPLICATION_ID || "").trim(),
    locationId: (import.meta.env.VITE_SQUARE_LOCATION_ID || "").trim(),
  };
}

/** Reject placeholder / mistyped Vercel env values (e.g. literal "VITE_SQUARE_APPLICATION_ID"). */
export function isSquareSandboxApplicationId(applicationId: string): boolean {
  return applicationId.trim().startsWith("sq0idb-");
}

export function isSquareProductionApplicationId(applicationId: string): boolean {
  return applicationId.trim().startsWith("sq0idp-");
}

export function isValidSquareApplicationId(applicationId: string): boolean {
  if (!applicationId) return false;
  if (applicationId.startsWith("VITE_")) return false;
  return isSquareSandboxApplicationId(applicationId) || isSquareProductionApplicationId(applicationId);
}

export function isValidSquareLocationId(locationId: string): boolean {
  if (!locationId) return false;
  if (locationId.startsWith("VITE_")) return false;
  return /^[A-Z0-9]+$/i.test(locationId);
}

export function isSquareClientConfigured(): boolean {
  const { applicationId, locationId } = readSquareEnvIds();
  return isValidSquareApplicationId(applicationId) && isValidSquareLocationId(locationId);
}

export function getSquareClientIds(): { applicationId: string; locationId: string } {
  return readSquareEnvIds();
}

export function describeSquareClientMisconfiguration(): string | null {
  const { applicationId, locationId } = readSquareEnvIds();
  if (!applicationId || !locationId) {
    return "Square checkout is not configured. Add VITE_SQUARE_APPLICATION_ID and VITE_SQUARE_LOCATION_ID in Vercel Production, then redeploy.";
  }
  if (!isValidSquareApplicationId(applicationId)) {
    return `Square Application ID looks wrong ("${applicationId.slice(0, 24)}…"). Use your Production Application ID from Square Developer (starts with sq0idp-).`;
  }
  if (isSquareSandboxApplicationId(applicationId) && import.meta.env.PROD) {
    return "Square Sandbox Application ID is deployed on the live site. Use Production credentials (sq0idp-…) in Vercel Production and redeploy.";
  }
  if (!isValidSquareLocationId(locationId)) {
    return "Square Location ID looks wrong. Use the same location ID as in Supabase SQUARE_LOCATION_ID.";
  }
  return null;
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
