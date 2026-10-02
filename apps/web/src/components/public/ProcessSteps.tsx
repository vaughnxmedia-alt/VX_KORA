import type { ProcessStep } from "@/content/types";

type ProcessStepsProps = {
  steps: ProcessStep[];
};

export function ProcessSteps({ steps }: ProcessStepsProps) {
  return (
    <ol className="grid gap-6 md:grid-cols-5 md:gap-4">
      {steps.map((step) => (
        <li key={step.order} className="relative md:pt-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-cream text-sm font-semibold text-primary mb-3">
            {step.order}
          </span>
          <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
