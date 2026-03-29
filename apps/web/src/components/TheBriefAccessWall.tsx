import { Card, CardContent } from "@/components/ui/card";
import { SubscriptionForm } from "./SubscriptionForm";

const TheBriefAccessWall = () => {
  return (
    <section className="py-16 md:py-24 lg:py-32 px-4 bg-background">
      <div className="max-w-xl mx-auto">
        <Card className="border border-border/50 shadow-sm bg-background">
          <CardContent className="p-8 md:p-12">
            <div className="text-center mb-6">
              <div className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase mb-4">
                The Brief
              </div>
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
                Receive The Brief
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                The Brief is released selectively.<br />
                This space is reserved for leaders who think long-term and value clarity before visibility.<br />
                Request access to receive future Briefs and foundational insights as they are released.
              </p>
            </div>
            <SubscriptionForm />
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TheBriefAccessWall;
