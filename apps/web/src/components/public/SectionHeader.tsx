import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "max-w-3xl space-y-4",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-dark">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground tracking-tight text-balance">
        {title}
      </h2>
      {description ? (
        <p className="text-lg text-muted-foreground leading-relaxed">{description}</p>
      ) : null}
    </div>
  );
}
