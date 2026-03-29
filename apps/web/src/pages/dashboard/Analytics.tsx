import { Card, CardContent } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function Analytics() {
  const { role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          {role === 'admin' ? 'Analytics & Engagement (Global)' : 'Analytics & Engagement Dashboard'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {role === 'admin' 
            ? "Company-wide analytics and performance metrics."
            : "Platform analytics (IG, TikTok, YT), engagement trends, content performance, and growth metrics."}
        </p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-4">Analytics Dashboard Coming Soon</h3>
          <p className="text-muted-foreground">
            Track your performance metrics and growth trends.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

