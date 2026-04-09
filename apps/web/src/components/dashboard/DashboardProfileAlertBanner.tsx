import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  formatMissingProfileList,
  getMissingCurrentUserProfileFields,
  SETTINGS_ACCOUNT_LINK_STATE,
  SETTINGS_PROFILE_HREF,
} from "@/lib/mandatory-profile-fields";
import { AlertCircle } from "lucide-react";

/**
 * Blue strip under the dashboard header when the signed-in user is missing mandatory profile fields.
 */
export function DashboardProfileAlertBanner() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const { data: check, isLoading } = useQuery({
    queryKey: ["dashboard-mandatory-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { missing: [] as ReturnType<typeof getMissingCurrentUserProfileFields> };

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, job_title, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        return { missing: getMissingCurrentUserProfileFields({
          sessionEmail: user.email,
          fullName: null,
          phone: null,
          jobTitle: null,
          role: null,
        }) };
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const missing = getMissingCurrentUserProfileFields({
        sessionEmail: user.email,
        fullName: profile?.full_name,
        phone: profile?.phone ?? null,
        jobTitle: profile?.job_title,
        role: roleRow?.role ?? null,
      });

      return { missing };
    },
    staleTime: 60_000,
  });

  if (!userId || isLoading) return null;

  const missing = check?.missing ?? [];
  if (missing.length === 0) return null;

  return (
    <div
      role="status"
      className="sticky top-14 z-[9] border-b border-blue-400/40 bg-blue-600 px-4 py-2.5 text-sm text-white shadow-sm lg:top-[60px]"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1">
        <AlertCircle className="h-4 w-4 shrink-0 text-blue-100" aria-hidden />
        <span className="font-medium">Complete your profile</span>
        <span className="text-blue-100">
          Add: {formatMissingProfileList(missing)}.
        </span>
        <Link
          to={SETTINGS_PROFILE_HREF}
          state={SETTINGS_ACCOUNT_LINK_STATE}
          className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold text-white underline-offset-2 hover:bg-white/25 hover:underline"
        >
          Open Settings → Account
        </Link>
      </div>
    </div>
  );
}
