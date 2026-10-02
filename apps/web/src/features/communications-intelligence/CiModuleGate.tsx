import { Navigate, Outlet } from "react-router-dom";
import { useHqAuth } from "@/features/hq/HqAuth";

/** Soft module gate inside HQ (RLS still enforces server-side). */
export function CiModuleGate() {
  const { can, isLoading } = useHqAuth();
  if (isLoading) return null;
  if (!can("intelligence")) {
    return <Navigate to="/hq" replace />;
  }
  return <Outlet />;
}
