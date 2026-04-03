import {
  Megaphone,
  Lightbulb,
  Scale,
  ShoppingCart,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Navy + gold ramp (light cream → gold → deep navy) matching JahKnowsPR tokens */
const STAGE_FILLS = [
  "hsl(45 38% 93%)",
  "hsl(45 48% 84%)",
  "hsl(45 62% 72%)",
  "hsl(45 70% 58%)",
  "hsl(220 100% 15%)",
] as const;

const BAR_BACKGROUNDS = [
  "hsl(45 32% 97%)",
  "hsl(45 38% 95%)",
  "hsl(45 45% 94%)",
  "hsl(45 50% 93%)",
  "hsl(220 40% 96%)",
] as const;

const STAGES: readonly {
  label: string;
  Icon: LucideIcon;
  blurb: string;
}[] = [
  {
    label: "Awareness",
    Icon: Megaphone,
    blurb: "Reach and visibility—people learn you exist.",
  },
  {
    label: "Interest",
    Icon: Lightbulb,
    blurb: "Curiosity and relevance—they lean in and explore.",
  },
  {
    label: "Decision",
    Icon: Scale,
    blurb: "Trust, proof, and fit—they weigh the move.",
  },
  {
    label: "Action",
    Icon: ShoppingCart,
    blurb: "The step you want—buy, book, sign, or reply.",
  },
  {
    label: "Retention",
    Icon: HeartHandshake,
    blurb: "Staying power—repeat business, loyalty, and referrals.",
  },
];

const SVG_W = 220;
const SVG_H = 275;
const ROWS = 5;
const BAND_H = SVG_H / ROWS;
const INSET = [0, 13, 26, 39, 52, 65];

function bandPoints(i: number): string {
  const y0 = i * BAND_H;
  const y1 = (i + 1) * BAND_H;
  const l0 = 8 + INSET[i];
  const r0 = SVG_W - 8 - INSET[i];
  const l1 = 8 + INSET[i + 1];
  const r1 = SVG_W - 8 - INSET[i + 1];
  return `${l0},${y0} ${r0},${y0} ${r1},${y1} ${l1},${y1}`;
}

function iconCenter(i: number): { cx: number; cy: number } {
  const y0 = i * BAND_H;
  const l0 = 8 + INSET[i];
  const r0 = SVG_W - 8 - INSET[i];
  const cx = l0 + (r0 - l0) * 0.28;
  const cy = y0 + BAND_H / 2;
  return { cx, cy };
}

function FunnelSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      preserveAspectRatio="xMidYMid meet"
      className={cn("h-full w-full max-h-[22rem] min-h-[16rem] max-w-[13.75rem]", className)}
      role="img"
      aria-label="Five-stage marketing funnel: Awareness through Retention."
    >
      <title>Marketing funnel</title>
      {STAGES.map((stage, i) => (
        <polygon
          key={stage.label}
          points={bandPoints(i)}
          fill={STAGE_FILLS[i]}
          stroke="hsl(var(--primary) / 0.12)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {STAGES.map((stage, i) => {
        const { Icon } = stage;
        const { cx, cy } = iconCenter(i);
        const darkBand = i === STAGES.length - 1;
        const fo = 26;
        return (
          <foreignObject
            key={`icon-${stage.label}`}
            x={cx - fo / 2}
            y={cy - fo / 2}
            width={fo}
            height={fo}
          >
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              className={cn(
                "flex h-full w-full items-center justify-center [&_svg]:h-[1.15rem] [&_svg]:w-[1.15rem] sm:[&_svg]:h-[1.25rem] sm:[&_svg]:w-[1.25rem]",
                darkBand ? "text-primary-foreground" : "text-primary",
              )}
            >
              <Icon strokeWidth={2.25} aria-hidden />
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}

export function StrategyAudienceFunnel({ className }: { className?: string }) {
  return (
    <div className={cn("w-full", className)}>
      <div className="mb-8 flex justify-center sm:mb-10">
        <span className="rounded-full bg-primary px-6 py-2.5 text-center font-sans text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-md sm:text-sm sm:tracking-[0.2em]">
          Marketing funnel
        </span>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-6 md:max-w-4xl md:flex-row md:items-stretch md:gap-5 lg:max-w-5xl lg:gap-6">
        <div className="flex shrink-0 justify-center md:w-[min(34%,13.5rem)] md:max-w-[220px] md:justify-start lg:w-[min(32%,240px)]">
          <div className="flex h-full min-h-[16rem] w-full max-w-[13.75rem] rounded-2xl border border-border/50 bg-card/40 p-4 shadow-sm ring-1 ring-border/30 md:max-w-none md:p-5">
            <FunnelSvg className="mx-auto md:mx-0" />
          </div>
        </div>

        <ol className="flex min-w-0 flex-1 flex-col gap-3 md:justify-between md:gap-2">
          {STAGES.map((stage, i) => (
            <li
              key={stage.label}
              className="flex min-h-[4.25rem] flex-1 flex-col justify-center rounded-xl border border-border/50 px-4 py-3 shadow-sm sm:min-h-[4.5rem] sm:px-5 sm:py-3.5 md:rounded-lg md:py-3"
              style={{ backgroundColor: BAR_BACKGROUNDS[i] }}
            >
              <h3 className="font-sans text-base font-bold tracking-tight text-foreground sm:text-lg">
                {stage.label}
              </h3>
              <p className="mt-1 font-sans text-sm leading-snug text-foreground/75 sm:text-[0.9375rem]">
                {stage.blurb}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
