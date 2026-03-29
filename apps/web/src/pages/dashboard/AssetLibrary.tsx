import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen } from "lucide-react";

export default function AssetLibrary() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Asset Library</h1>
        <p className="text-muted-foreground">Manage and browse content assets.</p>
      </div>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Coming soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Asset library will be available here. Upload and organize thumbnails, media, and other assets used in content operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
