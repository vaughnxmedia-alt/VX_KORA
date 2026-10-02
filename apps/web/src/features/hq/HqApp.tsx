import { Navigate } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { HqAuthProvider, useHqAuth } from "./HqAuth";
import { HqLayout } from "./HqLayout";
import { Loader2 } from "lucide-react";

function HqGate() {
  const { user, isLoading: authLoading } = useAuth();
  const { isHqStaff, isLoading } = useHqAuth();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream/40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth?next=/hq" replace />;
  }

  if (!isHqStaff) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream/40 px-4">
        <div className="max-w-md text-center space-y-3 rounded-lg border border-border bg-background p-8">
          <h1 className="font-serif text-2xl font-bold">HQ access required</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            JahKnowsPR HQ is private. Your account does not have an HQ role yet. Ask an Owner to grant access, or
            sign in with an admin account.
          </p>
          <a href="/dashboard" className="text-sm text-primary underline">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }

  return <HqLayout />;
}

export default function HqApp() {
  return (
    <HqAuthProvider>
      <HqGate />
    </HqAuthProvider>
  );
}
