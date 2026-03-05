import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SubscriptionForm } from "./SubscriptionForm";

const SubscriptionSection = () => {
  const principles = [
    "Positioning before promotion",
    "Narrative before noise",
    "Timing over tactics",
    "Visibility as a consequence, not a goal"
  ];

  return (
    <section className="py-24 px-6 bg-background border-b border-border/40">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-center">
          
          {/* Left Column: Copy & Principles */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              The Brief
            </div>
            
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground leading-tight">
              The Brief.
            </h2>
            
            <p className="text-lg text-muted-foreground italic">
              Clarity, before visibility.
            </p>
            
            <p className="text-base text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0">
              The Brief is where we publish our thinking before it becomes execution.
              These are the principles, patterns, and strategic considerations that shape how authority is built over time.
            </p>

            <div className="space-y-4 text-left pt-4">
              {principles.map((principle, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/40"></div>
                  <span className="text-foreground/80">{principle}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Form Card */}
          <div>
            <Card className="border border-border/50 shadow-sm bg-background">
              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-xl font-serif">Receive The Brief</CardTitle>
                <CardDescription className="text-muted-foreground">
                  The Brief is released selectively. Not every edition is public.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <SubscriptionForm />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </section>
  );
};

export default SubscriptionSection;
