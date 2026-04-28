import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCcw, Sparkles, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { generateAuditVisual } from "./api";
import {
  getWeakestMetric,
  scoreRows,
  visualMetaphor,
  type AuditVisualInput,
  type AuditVisualType,
} from "./engine";

type VisualState = {
  imageUrl: string | null;
  prompt: string | null;
  isLoading: boolean;
};

function VisualFrame({
  title,
  subtitle,
  imageUrl,
  loading,
  onGenerate,
  children,
}: {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  loading: boolean;
  onGenerate: () => Promise<void>;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 md:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void onGenerate()} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {imageUrl ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {imageUrl ? (
        <img src={imageUrl} alt={title} className="w-full rounded-xl border object-cover" />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center rounded-xl border bg-muted/40">
          <p className="text-sm text-muted-foreground">{loading ? "Generating..." : "No visual generated yet."}</p>
        </div>
      )}
      {children}
    </div>
  );
}

function useVisualGenerator(input: AuditVisualInput, visualType: AuditVisualType) {
  const [state, setState] = useState<VisualState>({ imageUrl: null, prompt: null, isLoading: false });

  async function runGeneration() {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const result = await generateAuditVisual(input, visualType);
      setState({ imageUrl: result.imageUrl, prompt: result.prompt, isLoading: false });
    } catch (error) {
      setState((prev) => ({ ...prev, isLoading: false }));
      toast.error(error instanceof Error ? error.message : "Could not generate visual");
    }
  }

  return {
    ...state,
    runGeneration,
  };
}

export function AuditHeroVisual({ data }: { data: AuditVisualInput }) {
  const visual = useVisualGenerator(data, "hero");
  const metaphor = useMemo(() => visualMetaphor(data), [data]);

  return (
    <VisualFrame
      title="Brand Diagnosis Visual"
      subtitle="Primary strategic gap translated into a premium editorial artifact."
      imageUrl={visual.imageUrl}
      loading={visual.isLoading}
      onGenerate={visual.runGeneration}
    >
      <div className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Metaphor:</span> {metaphor}
      </div>
    </VisualFrame>
  );
}

export function ScoreBreakdownVisual({ data }: { data: AuditVisualInput }) {
  const visual = useVisualGenerator(data, "score");
  const weakest = useMemo(() => getWeakestMetric(data), [data]);
  const rows = useMemo(() => scoreRows(data), [data]);

  return (
    <VisualFrame
      title="Score Visualization"
      subtitle="Minimal score map emphasizing the weakest strategic layer."
      imageUrl={visual.imageUrl}
      loading={visual.isLoading}
      onGenerate={visual.runGeneration}
    >
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{row.label}</span>
              <span className={row.key === weakest.key ? "font-semibold text-destructive" : "text-muted-foreground"}>
                {row.value}/100
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className={`h-2 rounded-full ${row.key === weakest.key ? "bg-destructive" : "bg-primary"}`}
                style={{ width: `${row.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <TrendingDown className="h-4 w-4 text-destructive" />
        Weakest area: <span className="font-semibold text-foreground">{weakest.label}</span>
      </div>
    </VisualFrame>
  );
}

export function InsightVisual({ data }: { data: AuditVisualInput }) {
  const visual = useVisualGenerator(data, "insight");
  return (
    <VisualFrame
      title="Insight Block Visual"
      subtitle="Conversion-forward strategic statement paired with symbolic design."
      imageUrl={visual.imageUrl}
      loading={visual.isLoading}
      onGenerate={visual.runGeneration}
    >
      <div className="mt-3 rounded-xl border border-gold/30 bg-gold/10 p-3">
        <p className="text-sm font-semibold">You’re not struggling to post. You’re struggling to position.</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-gold/40">Premium editorial style</Badge>
        <Badge variant="outline">No stock icons</Badge>
        <Badge variant="outline" className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Strategy artifact
        </Badge>
      </div>
      <div className="mt-4">
        <Button asChild size="sm">
          <Link to="/brand-strategy-session">Move to Strategy Session</Link>
        </Button>
      </div>
    </VisualFrame>
  );
}
