import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileBarChart } from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Reports</h1>
        <p className="text-muted-foreground">Performance and operational reports.</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileBarChart className="w-5 h-5" />
            Coming soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Custom reports and exports will be available here. Connect analytics and campaign data for detailed reporting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
