import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

export default function FilmingSchedule() {
  const { role } = useAuth();

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4">
          {role === 'admin' ? 'Global Filming Schedule' : 'Filming Schedule'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {role === 'admin' 
            ? "All shoots across all clients."
            : "Video shoot days, content production tasks, location planning, and shot lists."}
        </p>
      </div>
      <Card>
        <CardContent className="py-16 text-center">
          <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-4">Filming Schedule Coming Soon</h3>
          <p className="text-muted-foreground">
            Track production dates, locations, and shot lists.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

