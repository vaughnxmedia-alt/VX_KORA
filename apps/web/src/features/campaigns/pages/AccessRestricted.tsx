import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export function AccessRestricted() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-6">
      <ShieldAlert className="w-12 h-12 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Access restricted</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        You don’t have access to this campaign. Only assigned team members and admins can view it.
      </p>
      <Button asChild variant="outline">
        <Link to="/dashboard/campaigns">Back to Campaigns</Link>
      </Button>
    </div>
  );
}
