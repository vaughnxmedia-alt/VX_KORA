import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";

type DirectAnswerBlockProps = {
  question: string;
  answer: string;
};

type FAQ = {
  question: string;
  answer: string;
};

export function DirectAnswerBlock({ question, answer }: DirectAnswerBlockProps) {
  return (
    <section className="rounded-3xl border border-primary/15 bg-primary/5 p-6 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Direct answer</p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">{question}</h2>
      <p className="mt-4 text-lg leading-relaxed text-foreground/85">{answer}</p>
    </section>
  );
}

export function FAQSection({ title = "Common questions", faqs }: { title?: string; faqs: FAQ[] }) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">FAQ</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-3">
        {faqs.map((faq) => (
          <details key={faq.question} className="group rounded-2xl border bg-white p-5 shadow-sm">
            <summary className="cursor-pointer list-none font-semibold text-primary">{faq.question}</summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function ServiceDefinitionBlock({
  service,
  definition,
  outcomes,
}: {
  service: string;
  definition: string;
  outcomes: string[];
}) {
  return (
    <section className="rounded-3xl border bg-white p-6 shadow-sm md:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Service definition</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight">{service}</h2>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{definition}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {outcomes.map((outcome) => (
          <div key={outcome} className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>{outcome}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CityAnswerBlock({
  cityName,
  answer,
  href,
  linkLabel,
}: {
  cityName: string;
  answer: string;
  href: string;
  linkLabel?: string;
}) {
  return (
    <section className="rounded-3xl border border-amber-500/25 bg-amber-500/5 p-6 md:p-8">
      <div className="flex items-start gap-3">
        <MapPin className="mt-1 h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">City answer</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Does JahKnowsPR work with {cityName} businesses?</h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground">{answer}</p>
          <Link to={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
            {linkLabel || `View ${cityName} strategy page`} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
