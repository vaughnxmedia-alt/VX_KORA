import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Settings</h1>
        <p className="text-muted-foreground">Application and account settings.</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Settings and preferences will be available here. For team and permissions, use Admin under System.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
