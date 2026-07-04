import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Canonical Brief cover art ratio (940×788). */
export const BLOG_COVER_ASPECT = "940/788" as const;

export type BlogCoverVariant = "article" | "card" | "hero" | "carousel" | "related";

const FRAME_CLASS: Record<BlogCoverVariant, string> = {
  /** Full-width post hero — height scales with viewport on phones/tablets. */
  article:
    "relative w-full overflow-hidden h-[clamp(220px,48vw,320px)] sm:h-[clamp(300px,42vw,400px)] md:h-[440px] lg:h-[500px]",
  /** Homepage Editor's Pick — native ratio from tablet up; slightly wider crop on phones. */
  hero: "relative w-full overflow-hidden aspect-[4/3] sm:aspect-[940/788]",
  /** Grid cards and listings. */
  card: "relative w-full overflow-hidden aspect-[4/3] sm:aspect-[940/788]",
  /** Featured Insights carousel slide. */
  carousel: "relative w-full overflow-hidden aspect-[4/3] sm:aspect-[940/788] lg:aspect-[940/788]",
  /** Related posts at the bottom of an article. */
  related: "relative w-full overflow-hidden aspect-[4/3] sm:aspect-[940/788]",
};

type BlogCoverImageProps = {
  src?: string | null;
  alt: string;
  variant: BlogCoverVariant;
  className?: string;
  imageClassName?: string;
  hoverZoom?: boolean;
  priority?: boolean;
  onClick?: () => void;
  children?: ReactNode;
};

export function getBlogCoverFrameClass(variant: BlogCoverVariant): string {
  return FRAME_CLASS[variant];
}

export function BlogCoverImage({
  src,
  alt,
  variant,
  className,
  imageClassName,
  hoverZoom = false,
  priority = false,
  onClick,
  children,
}: BlogCoverImageProps) {
  const hasImage = Boolean(src?.trim());
  const isInteractive = Boolean(onClick);

  return (
    <div
      className={cn(
        getBlogCoverFrameClass(variant),
        "bg-muted",
        isInteractive && "group/cover",
        className,
      )}
    >
      {hasImage ? (
        <img
          src={src!}
          alt={alt}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          sizes={
            variant === "article"
              ? "100vw"
              : variant === "carousel" || variant === "hero"
                ? "(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 940px"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
          }
          className={cn(
            "absolute inset-0 h-full w-full object-cover object-center",
            hoverZoom &&
              "transition-transform duration-500 group-hover:scale-105 group-hover/cover:scale-105",
            isInteractive &&
              !hoverZoom &&
              "transition-transform duration-500 group-hover/cover:scale-105",
            imageClassName,
          )}
        />
      ) : (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br from-primary/15 via-muted to-gold/10",
            hoverZoom &&
              "transition-transform duration-500 group-hover:scale-105 group-hover/cover:scale-105",
            isInteractive &&
              !hoverZoom &&
              "transition-transform duration-500 group-hover/cover:scale-105",
          )}
        />
      )}

      {isInteractive && (
        <button
          type="button"
          className="absolute inset-0 z-[1] cursor-pointer border-0 bg-transparent p-0"
          aria-label={`Read article: ${alt}`}
          onClick={onClick}
        />
      )}

      {children}
    </div>
  );
}
