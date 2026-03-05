import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function StrategyUpdates() {
  const { role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          {role === 'admin' ? 'Strategy Updates & Ideas' : 'Strategy Updates & Ideas'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {role === 'admin' 
            ? "Collective strategy notes and high-level agency insights."
            : "Running log of strategic recommendations, brainstorm notes, agent suggestions, and campaign ideas."}
        </p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <Lightbulb className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-4">Strategy Hub Coming Soon</h3>
          <p className="text-muted-foreground">
            Access strategic insights and campaign ideas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

