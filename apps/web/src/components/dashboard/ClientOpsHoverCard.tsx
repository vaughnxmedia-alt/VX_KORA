import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Enums } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { SETTINGS_ACCOUNT_LINK_STATE, SETTINGS_PROFILE_HREF } from "@/lib/mandatory-profile-fields";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/AuthProvider";
import { isAppOwnerJustice } from "@/lib/super-ops";

type UserRole = Enums<"user_role">;

export type ClientOpsCustomerRow = {
  id: string;
  user_id?: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
};

type ClientOpsClientUserRow = {
  user_id: string;
  full_name: string | null;
  role: UserRole | null;
};

function displayCustomerName(c: ClientOpsCustomerRow): string {
  if (c.first_name || c.last_name) {
    return `${c.first_name || ""} ${c.last_name || ""}`.trim();
  }
  return "—";
}

function splitFullName(full: string): { first_name: string | null; last_name: string | null } {
  const t = full.trim();
  if (!t) return { first_name: null, last_name: null };
  const i = t.lastIndexOf(" ");
  if (i <= 0) return { first_name: t, last_name: null };
  return { first_name: t.slice(0, i).trim() || null, last_name: t.slice(i + 1).trim() || null };
}

function SecretValue({
  label,
  value,
  monospace,
}: {
  label: string;
  value: string | null | undefined;
  monospace?: boolean;
}) {
  const [show, setShow] = useState(false);
  if (value == null || value === "") {
    return (
      <div className="space-y-1">
        <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
        <p className="text-sm text-muted-foreground">Not available</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-[10px] uppercase text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        <span className={monospace ? "font-mono text-xs break-all" : "text-sm break-words"}>
          {show ? value : "••••••••"}
        </span>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setShow((s) => !s)}>
          {show ? "Hide" : "Show"}
        </Button>
      </div>
    </div>
  );
}

function MaskedPasswordRow() {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] uppercase text-muted-foreground">Account password</Label>
      <div className="rounded-md border border-border/80 bg-muted/50 px-3 py-2" aria-hidden>
        <p className="font-mono text-base tracking-[0.35em] text-foreground/70 blur-[2.5px] select-none">••••••••••••</p>
      </div>
    </div>
  );
}

const ROLE_OPTIONS: UserRole[] = ["admin", "author", "client"];

async function invokeAppOwnerCredentials(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("app-owner-user-credentials", { body });
  if (error) throw new Error(error.message);
  if (data && typeof data === "object" && data !== null && "error" in data && (data as { error: string }).error) {
    throw new Error((data as { error: string }).error);
  }
}

function EditableOpsPanelBody({
  open,
  enabled,
  panelKey,
  mode,
  customerId,
  authUserId,
  initialDisplayName,
  initialAccountEmail,
  initialCrmPhone,
  roleLabel,
  jobTitleProp,
  viewerUserId,
  viewerSessionEmail,
  appOwnerCanManageCredentials,
}: {
  open: boolean;
  enabled: boolean;
  panelKey: number;
  mode: "customer" | "profileUser";
  customerId: string | null;
  authUserId: string | null;
  initialDisplayName: string;
  /** On-file email for this client row (e.g. before login existed, or when Auth has no address yet). */
  initialAccountEmail: string | null;
  initialCrmPhone: string | null;
  roleLabel: UserRole | null;
  jobTitleProp: string | null;
  viewerUserId: string | null;
  viewerSessionEmail: string | null;
  appOwnerCanManageCredentials: boolean;
}) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordRecentlySet, setPasswordRecentlySet] = useState(false);
  const userEditedAccountEmailRef = useRef(false);

  const { data: authSummary, isFetching: authLoading } = useQuery({
    queryKey: ["super-ops-auth-summary", authUserId],
    enabled: enabled && open && !!authUserId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("super_ops_auth_user_summary", {
        target_user_id: authUserId!,
      });
      if (error) return null;
      const row = data?.[0];
      return row
        ? {
            loginEmail: row.login_email,
            emailConfirmedAt: row.email_confirmed_at,
            lastSignInAt: row.last_sign_in_at,
          }
        : null;
    },
  });

  const { data: profileExtras, isFetching: profileExtrasLoading } = useQuery({
    queryKey: ["super-ops-profile-extras", authUserId],
    enabled: enabled && open && !!authUserId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("job_title, phone, full_name").eq("id", authUserId!).maybeSingle();
      if (error) return { job_title: null as string | null, phone: null as string | null, full_name: null as string | null };
      return {
        job_title: data?.job_title ?? null,
        phone: data?.phone ?? null,
        full_name: data?.full_name ?? null,
      };
    },
  });

  const rpcEmail = authSummary?.loginEmail?.trim() || null;
  const selfSessionEmailFallback =
    authUserId && viewerUserId && authUserId === viewerUserId ? viewerSessionEmail?.trim() || null : null;
  const resolvedAuthEmail = rpcEmail || selfSessionEmailFallback;

  const canPersistAccountEmail = Boolean(customerId);
  const canEditAccountEmailNonOwner =
    canPersistAccountEmail &&
    (!authUserId || (!resolvedAuthEmail && !authLoading));
  const showAccountEmailReadOnlyNonOwner = Boolean(authUserId && resolvedAuthEmail && !appOwnerCanManageCredentials);
  const showAccountEmailLoading = Boolean(
    authUserId && authLoading && !resolvedAuthEmail && !selfSessionEmailFallback,
  );
  const ownerEditableLinkedEmail = Boolean(appOwnerCanManageCredentials && authUserId);

  useEffect(() => {
    userEditedAccountEmailRef.current = false;
    setPasswordRecentlySet(false);
  }, [panelKey]);

  useEffect(() => {
    if (!open) return;
    const rpc = authSummary?.loginEmail?.trim() || null;
    const selfFb =
      authUserId && viewerUserId && authUserId === viewerUserId ? viewerSessionEmail?.trim() || null : null;
    setAccountEmail(rpc || selfFb || initialAccountEmail?.trim() || "");
  }, [panelKey]);

  useEffect(() => {
    if (!open || userEditedAccountEmailRef.current) return;
    const rpc = authSummary?.loginEmail?.trim();
    if (rpc) {
      setAccountEmail((prev) => (prev.trim() === "" ? rpc : prev));
    }
  }, [open, authSummary?.loginEmail]);

  // Hydrate form when dialog opens or server data arrives
  useEffect(() => {
    if (!open) return;
    const display = initialDisplayName === "—" ? "" : initialDisplayName;
    setFullName(display);
    setRole((roleLabel || "") as UserRole | "");
    setJobTitle(jobTitleProp?.trim() || profileExtras?.job_title?.trim() || "");
    const pPhone = profileExtras?.phone?.trim() || "";
    const cPhone = initialCrmPhone?.trim() || "";
    setPhone(cPhone || pPhone || "");
  }, [
    open,
    initialDisplayName,
    initialCrmPhone,
    roleLabel,
    jobTitleProp,
    profileExtras?.job_title,
    profileExtras?.phone,
    profileExtras?.full_name,
  ]);

  // Prefer profile full_name for linked users once loaded (ops accuracy)
  useEffect(() => {
    if (!open || !authUserId || mode !== "profileUser") return;
    const pn = profileExtras?.full_name?.trim();
    if (pn && !profileExtrasLoading) setFullName(pn);
  }, [open, authUserId, mode, profileExtras?.full_name, profileExtrasLoading]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const rpcLogin = authSummary?.loginEmail?.trim() || null;
      const selfF =
        authUserId && viewerUserId && authUserId === viewerUserId ? viewerSessionEmail?.trim() || null : null;
      const baselineAuth = rpcLogin || selfF;
      const nextEmail = accountEmail.trim();

      if (appOwnerCanManageCredentials && authUserId && nextEmail) {
        if (nextEmail.toLowerCase() !== (baselineAuth || "").toLowerCase()) {
          await invokeAppOwnerCredentials({
            action: "set_email",
            target_user_id: authUserId,
            new_email: nextEmail,
          });
        }
      }

      if (mode === "customer" && customerId) {
        const { first_name, last_name } = splitFullName(fullName);
        let resolvedEmail: string | null;
        if (!authUserId) {
          resolvedEmail = nextEmail || null;
        } else if (appOwnerCanManageCredentials) {
          resolvedEmail = nextEmail || null;
        } else {
          resolvedEmail = baselineAuth || nextEmail || null;
        }
        const { error: cErr } = await supabase
          .from("customers")
          .update({
            first_name,
            last_name,
            email: resolvedEmail,
            phone_number: phone.trim() || null,
          })
          .eq("id", customerId);
        if (cErr) throw cErr;
      }

      if (authUserId) {
        const { error: pErr } = await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim() || null,
            phone: phone.trim() || null,
            job_title: jobTitle.trim() || null,
          })
          .eq("id", authUserId);
        if (pErr) throw pErr;

        if (role && (role === "admin" || role === "author" || role === "client")) {
          const { data: existing } = await supabase.from("user_roles").select("user_id").eq("user_id", authUserId).maybeSingle();
          if (existing) {
            const { error: rErr } = await supabase.from("user_roles").update({ role }).eq("user_id", authUserId);
            if (rErr) throw rErr;
          }
        }
      }
    },
    onSuccess: () => {
      toast.success("Saved", {
        description: authUserId
          ? "They can sign in with this account email and password. For client workers, set sidebar pages under Users → row menu."
          : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["users-with-roles"] });
      queryClient.invalidateQueries({ queryKey: ["all-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["customers-telegram-intake-complete"] });
      queryClient.invalidateQueries({ queryKey: ["customers-pending-intake"] });
      queryClient.invalidateQueries({ queryKey: ["super-ops-profile-extras", authUserId] });
      queryClient.invalidateQueries({ queryKey: ["super-ops-auth-summary", authUserId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-mandatory-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
    },
    onError: (e: Error) => {
      toast.message("Could not save", { description: e.message });
    },
  });

  const sendReset = async () => {
    if (!appOwnerCanManageCredentials) {
      toast.info("Only the app owner can send password reset emails from this panel.");
      return;
    }
    const target = (resolvedAuthEmail || accountEmail).trim();
    if (!target) {
      toast.info(
        "Set an account email in Supabase Auth, or enter the on-file address above for teammates who predate signup.",
      );
      return;
    }
    const redirectTo = `${window.location.origin}/auth`;
    const { error } = await supabase.auth.resetPasswordForEmail(target, { redirectTo });
    if (error) {
      toast.message("Could not send reset email", { description: error.message });
      return;
    }
    toast.success("Password reset email sent.");
  };

  const applyNewPassword = async () => {
    if (!appOwnerCanManageCredentials || !authUserId) return;
    if (newPassword.length < 8) {
      toast.info("Use at least 8 characters for the new password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.info("Passwords do not match.");
      return;
    }
    try {
      await invokeAppOwnerCredentials({
        action: "set_password",
        target_user_id: authUserId,
        new_password: newPassword,
      });
      setNewPassword("");
      setConfirmPassword("");
      setPasswordRecentlySet(true);
      toast.success("Password updated in Supabase Auth.");
    } catch (e) {
      toast.message("Could not set password", { description: (e as Error).message });
    }
  };

  const showProfileFields = Boolean(authUserId);
  const showRoleField = showProfileFields;

  return (
    <div className="space-y-4 text-foreground">
      <div className="space-y-2">
        <Label htmlFor="ops-full-name">{mode === "customer" ? "Full name (CRM)" : "Display name"}</Label>
        <Input
          id="ops-full-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="First Last"
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ops-phone">Phone</Label>
        <Input
          id="ops-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 …"
          disabled={profileExtrasLoading && !phone && !!authUserId}
        />
        {profileExtrasLoading && !phone && !!authUserId && (
          <p className="text-[11px] text-muted-foreground">Loading profile phone…</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ops-account-email">Account email</Label>
        {ownerEditableLinkedEmail ? (
          <>
            {showAccountEmailLoading ? (
              <p className="text-sm text-muted-foreground">Checking Auth… you can still type or edit below.</p>
            ) : null}
            <Input
              id="ops-account-email"
              type="email"
              value={accountEmail}
              onChange={(e) => {
                userEditedAccountEmailRef.current = true;
                setAccountEmail(e.target.value);
              }}
              placeholder="name@company.com"
              autoComplete="email"
            />
          </>
        ) : showAccountEmailLoading ? (
          <p className="text-sm text-muted-foreground">Loading account email…</p>
        ) : showAccountEmailReadOnlyNonOwner ? (
          <>
            <Input
              id="ops-account-email"
              readOnly
              className="bg-muted/50 font-mono text-sm"
              value={resolvedAuthEmail || "—"}
            />
            <p className="text-[11px] text-muted-foreground">
              From authentication. Ask the app owner to change it, or use Supabase Auth admin.
            </p>
          </>
        ) : canEditAccountEmailNonOwner ? (
          <>
            <Input
              id="ops-account-email"
              type="email"
              value={accountEmail}
              onChange={(e) => {
                userEditedAccountEmailRef.current = true;
                setAccountEmail(e.target.value);
              }}
              placeholder="name@company.com"
              autoComplete="email"
            />
            <p className="text-[11px] text-muted-foreground">
              No login email on file yet (common for teammates who joined before signup). Save the address here and match it in Auth when their account is created.
            </p>
          </>
        ) : (
          <>
            <Input readOnly className="bg-muted/50 text-sm" value="—" />
            <p className="text-[11px] text-muted-foreground">
              No client row to store email. Set the login email in Supabase Auth or ask the app owner.
            </p>
          </>
        )}
      </div>

      {showProfileFields && (
        <div className="space-y-2">
          <Label htmlFor="ops-job">Job title</Label>
          <Input
            id="ops-job"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Founder, Strategist"
            disabled={profileExtrasLoading && !jobTitle}
          />
        </div>
      )}

      {showRoleField && (
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={role ? role : undefined} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!showProfileFields && (
        <p className="text-xs text-muted-foreground rounded-md border border-dashed p-2">
          No linked login for this client. Link a <code className="text-[11px]">user_id</code> to edit job title, role, and profile phone in sync with CRM.
        </p>
      )}

      {authUserId ? (
        <>
          <SecretValue label="User ID" value={authUserId} monospace />
          {appOwnerCanManageCredentials ? (
            <>
              <MaskedPasswordRow />
              {(authSummary?.emailConfirmedAt || authSummary?.lastSignInAt) && (
                <div className="text-[11px] text-muted-foreground space-y-0.5 border-t border-border/60 pt-2">
                  {authSummary.emailConfirmedAt && (
                    <p>Email confirmed: {format(new Date(authSummary.emailConfirmedAt), "PPp")}</p>
                  )}
                  {authSummary.lastSignInAt && <p>Last sign-in: {format(new Date(authSummary.lastSignInAt), "PPp")}</p>}
                </div>
              )}
              {passwordRecentlySet ? (
                <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => void sendReset()}>
                  Reset password
                </Button>
              ) : (
                <div className="space-y-2 rounded-md border border-border/80 p-3">
                  <Label className="text-xs">Set new password (writes to Supabase Auth)</Label>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 8 characters)"
                  />
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => void applyNewPassword()}>
                    Set password now
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground rounded-md border border-dashed p-2">
              Password reset and setting passwords are limited to the app owner account (Justice). You can still edit profile fields above if you have access.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Password tools appear once this client has a linked login. Save an account email on the client record first if they don’t have Auth yet.{" "}
          <Link to={SETTINGS_PROFILE_HREF} state={SETTINGS_ACCOUNT_LINK_STATE} className="underline text-primary">
            Settings
          </Link>
        </p>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <Button type="button" className="flex-1" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
          {saveMutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

type ClientOpsHoverCardProps = {
  enabled: boolean;
  variant: "customer" | "clientUser";
  customer?: ClientOpsCustomerRow;
  clientUser?: ClientOpsClientUserRow;
  linkedRole?: UserRole | null;
  jobTitle?: string | null;
  children: React.ReactNode;
};

/** Click the name to open ops details (super-ops users only). */
export function ClientOpsHoverCard({
  enabled,
  variant,
  customer,
  clientUser,
  linkedRole,
  jobTitle: jobTitleProp,
  children,
}: ClientOpsHoverCardProps) {
  const { session } = useAuth();
  const appOwnerCanManageCredentials = isAppOwnerJustice(session?.user?.email ?? null);
  const viewerUserId = session?.user?.id ?? null;
  const viewerSessionEmail = session?.user?.email ?? null;
  const [open, setOpen] = useState(false);
  const [panelKey, setPanelKey] = useState(0);

  if (!enabled) {
    return <>{children}</>;
  }

  if (variant === "customer" && customer) {
    const name = displayCustomerName(customer);
    const roleLabel = linkedRole ?? null;
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative z-10 text-left font-medium text-primary hover:text-primary/90 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm cursor-pointer bg-transparent border-0 p-0 m-0 shadow-none inline-flex min-h-9 items-center max-w-full"
        >
          {children}
        </button>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setPanelKey((k) => k + 1);
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto z-[200]">
            <DialogHeader>
              <DialogTitle>Account details</DialogTitle>
              <DialogDescription className="sr-only">Edit account details and save.</DialogDescription>
            </DialogHeader>
            <EditableOpsPanelBody
              open={open}
              enabled={enabled}
              panelKey={panelKey}
              mode="customer"
              customerId={customer.id}
              authUserId={customer.user_id?.trim() || null}
              initialDisplayName={name}
              initialAccountEmail={customer.email}
              initialCrmPhone={customer.phone_number}
              roleLabel={roleLabel}
              jobTitleProp={jobTitleProp ?? null}
              viewerUserId={viewerUserId}
              viewerSessionEmail={viewerSessionEmail}
              appOwnerCanManageCredentials={appOwnerCanManageCredentials}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (variant === "clientUser" && clientUser) {
    const name = clientUser.full_name || "—";
    const roleLabel = clientUser.role;
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative z-10 text-left font-medium text-primary hover:text-primary/90 underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm cursor-pointer bg-transparent border-0 p-0 m-0 shadow-none inline-flex min-h-9 items-center max-w-full"
        >
          {children}
        </button>
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (next) setPanelKey((k) => k + 1);
          }}
        >
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto z-[200]">
            <DialogHeader>
              <DialogTitle>Account details</DialogTitle>
              <DialogDescription className="sr-only">Edit account details and save.</DialogDescription>
            </DialogHeader>
            <EditableOpsPanelBody
              open={open}
              enabled={enabled}
              panelKey={panelKey}
              mode="profileUser"
              customerId={null}
              authUserId={clientUser.user_id}
              initialDisplayName={name}
              initialAccountEmail={null}
              initialCrmPhone={null}
              roleLabel={roleLabel}
              jobTitleProp={jobTitleProp ?? null}
              viewerUserId={viewerUserId}
              viewerSessionEmail={viewerSessionEmail}
              appOwnerCanManageCredentials={appOwnerCanManageCredentials}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return <>{children}</>;
}
