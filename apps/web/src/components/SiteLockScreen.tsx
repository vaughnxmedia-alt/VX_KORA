import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Lock } from "lucide-react";

/** Max z-index so this stays above Radix/Sonner portals (they mount on document.body). */
const LOCK_Z = 2147483647;

/**
 * Temporary overlay: blurs the live page behind. Remove from main.tsx when you reopen the site.
 */
export function SiteLockScreen() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <div
      style={{ zIndex: LOCK_Z }}
      className="pointer-events-auto fixed inset-0 flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-slate-500/60 px-6 text-center backdrop-blur-xl backdrop-saturate-50"
      role="status"
      aria-live="polite"
      aria-label="Site temporarily unavailable"
    >
      <Lock
        className="h-40 w-40 shrink-0 text-slate-900 drop-shadow-sm sm:h-52 sm:w-52 md:h-64 md:w-64"
        strokeWidth={1.25}
        aria-hidden
      />
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          We&apos;ll be right back
        </h1>
        <p className="text-base text-slate-700 sm:text-lg">
          This space is being prepared. Check back soon.
        </p>
      </div>
    </div>,
    document.body
  );
}
