import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function TargetAudience() {
  const { role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          {role === 'admin' ? 'Global Audience Insights' : 'Target Audience Report'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {role === 'admin' 
            ? "Overall audience patterns and cross-client behavioral insights."
            : "Audience personas, psychographics, data insights, and industry-specific demographics."}
        </p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-4">Audience Data Coming Soon</h3>
          <p className="text-muted-foreground">
            Detailed audience analysis and reports will be displayed here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

