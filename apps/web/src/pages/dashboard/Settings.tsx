import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { isAppOwner } from "@/lib/super-ops";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings as SettingsIcon, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  QrCode,
  Bell,
  Calendar,
  Sparkles,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { CAMPAIGN_TIMEZONE_OPTIONS, DEFAULT_CAMPAIGN_TIMEZONE } from "@/lib/campaignSchedule";

type DeliveryFrequency = "daily" | "weekly" | "none";

interface TelegramStatus {
  isConnected: boolean;
  isVerified: boolean;
  chatId: string | null;
  botUsername: string;
  lastMessageSent: string | null;
  nextScheduled: string | null;
}

function AccountProfileForm() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const sessionEmail = session?.user?.email ?? null;
  const appOwner = isAppOwner(sessionEmail);
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_CAMPAIGN_TIMEZONE);

  const { data: authUser, isLoading: authUserLoading } = useQuery({
    queryKey: ["settings-auth-user", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["settings-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, job_title, phone, timezone")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name?.trim() || "");
    setJobTitle(profile.job_title?.trim() || "");
    setPhone(profile.phone?.trim() || "");
    setTimezone(profile.timezone?.trim() || DEFAULT_CAMPAIGN_TIMEZONE);
  }, [profile]);

  useEffect(() => {
    const fromAuth = authUser?.email?.trim() || sessionEmail?.trim() || "";
    setAccountEmail(fromAuth);
  }, [authUser?.email, sessionEmail]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const nextEmail = accountEmail.trim();
      const currentAuthEmail = authUser?.email?.trim() || sessionEmail?.trim() || "";
      if (nextEmail && nextEmail.toLowerCase() !== currentAuthEmail.toLowerCase()) {
        const { error: emailErr } = await supabase.auth.updateUser({ email: nextEmail });
        if (emailErr) throw emailErr;
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim() || null,
          job_title: jobTitle.trim() || null,
          phone: phone.trim() || null,
          timezone: timezone.trim() || DEFAULT_CAMPAIGN_TIMEZONE,
        })
        .eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["settings-profile"] });
      queryClient.invalidateQueries({ queryKey: ["settings-auth-user"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-mandatory-profile"] });
      queryClient.invalidateQueries({ queryKey: ["current-user-profile"] });
    },
    onError: (e: Error) => {
      toast.message("Could not save profile", { description: e.message });
    },
  });

  const savePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 8) throw new Error("Use at least 8 characters.");
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match.");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    },
    onError: (e: Error) => {
      toast.message("Could not update password", { description: e.message });
    },
  });

  if (!userId) {
    return <p className="text-muted-foreground text-sm">Sign in to edit your profile.</p>;
  }

  const authEmailResolved = authUser?.email?.trim() || sessionEmail?.trim() || "";
  const canEditAccountEmail = appOwner || !authEmailResolved;

  return (
    <div className="space-y-4 max-w-md">
      <p className="text-sm text-muted-foreground">
        Complete these fields to clear the blue alert on your dashboard. Account email is the address you use to sign in (from Auth, refreshed on load).
      </p>
      <div className="space-y-2">
        <Label htmlFor="acct-email">Account email</Label>
        <Input
          id="acct-email"
          type="email"
          value={accountEmail}
          onChange={(e) => setAccountEmail(e.target.value)}
          readOnly={!canEditAccountEmail}
          className={canEditAccountEmail ? "" : "bg-muted/50"}
          placeholder={authUserLoading ? "Loading…" : "you@example.com"}
          disabled={authUserLoading}
        />
        {appOwner ? (
          <p className="text-[11px] text-muted-foreground">
            App owner: you can change your login email here; Supabase may send a confirmation to the new address depending on your project settings.
          </p>
        ) : authEmailResolved ? (
          <p className="text-[11px] text-muted-foreground">
            Managed by Supabase Auth. Use account recovery or ask the app owner if you need a different login email.
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            No email on this session yet (e.g. early account). Enter your login email and save—we’ll register it with Auth.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="acct-name">Display name</Label>
        <Input
          id="acct-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Your full name"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="acct-phone">Phone</Label>
        <Input
          id="acct-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 …"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="acct-job">Job title</Label>
        <Input
          id="acct-job"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Founder, Strategist"
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="acct-timezone">Timezone</Label>
        <Select value={timezone} onValueChange={setTimezone} disabled={isLoading}>
          <SelectTrigger id="acct-timezone">
            <SelectValue placeholder="Select timezone" />
          </SelectTrigger>
          <SelectContent>
            {CAMPAIGN_TIMEZONE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground">
          Used for campaign send times and admin confirmation emails. Subscriber blasts schedule in this timezone (default Central).
        </p>
      </div>
      <Button
        type="button"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || isLoading || authUserLoading}
      >
        {saveMutation.isPending ? "Saving…" : "Save profile"}
      </Button>

      {appOwner ? (
        <div className="space-y-3 pt-6 border-t border-border">
          <p className="text-sm font-medium">Password (app owner)</p>
          <p className="text-xs text-muted-foreground">
            Change your own sign-in password. To set another user’s password, use their row on the Users / Clients page while signed in as the app owner.
          </p>
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
          <Button
            type="button"
            variant="outline"
            disabled={savePasswordMutation.isPending}
            onClick={() => savePasswordMutation.mutate()}
          >
            {savePasswordMutation.isPending ? "Updating…" : "Update my password"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default function Settings() {
  const location = useLocation();
  const settingsTabDefault =
    (location.state as { defaultSettingsTab?: string } | null)?.defaultSettingsTab === "account"
      ? "account"
      : "telegram";

  const [telegramStatus] = useState<TelegramStatus>({
    isConnected: true,
    isVerified: true,
    chatId: "8216104620",
    botUsername: "@KORAIntelBot",
    lastMessageSent: "Today 7:00 AM",
    nextScheduled: "Tomorrow 7:00 AM"
  });

  const [deliveryFrequency, setDeliveryFrequency] = useState<DeliveryFrequency>("daily");
  const [briefingTime, setBriefingTime] = useState("07:00");
  const [includeContentStrategy, setIncludeContentStrategy] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [makeMeSmarter, setMakeMeSmarter] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your KORA preferences and integrations.</p>
      </div>

      <Tabs defaultValue={settingsTabDefault} className="space-y-6">
        <TabsList>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Telegram Settings */}
        <TabsContent value="telegram" className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                Telegram Connection
              </CardTitle>
              <CardDescription>
                Connect to KORA's Telegram bot to receive daily intelligence briefings and approve content strategies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Display */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${telegramStatus.isConnected ? "bg-green-100" : "bg-gray-100"}`}>
                    <Send className={`h-6 w-6 ${telegramStatus.isConnected ? "text-green-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {telegramStatus.isConnected ? "Connected" : "Not Connected"}
                      </span>
                      {telegramStatus.isVerified ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    {telegramStatus.chatId && (
                      <p className="text-sm text-muted-foreground">
                        Chat ID: {telegramStatus.chatId} • Bot: {telegramStatus.botUsername}
                      </p>
                    )}
                  </div>
                </div>
                {telegramStatus.isConnected ? (
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconnect
                  </Button>
                ) : (
                  <Button size="sm">
                    Connect Bot
                  </Button>
                )}
              </div>

              {/* QR Code Section */}
              {!telegramStatus.isConnected && (
                <div className="flex flex-col items-center py-8 border-2 border-dashed rounded-lg">
                  <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <QrCode className="h-24 w-24 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Scan with Telegram to connect</p>
                  <p className="text-xs text-muted-foreground">
                    Or search for {telegramStatus.botUsername} in Telegram
                  </p>
                </div>
              )}

              {/* Last Message Info */}
              {telegramStatus.isConnected && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Last Message Sent</p>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {telegramStatus.lastMessageSent || "Never"}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Next Scheduled</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {telegramStatus.nextScheduled || "Not scheduled"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Preferences</CardTitle>
              <CardDescription>
                Choose how often you want to receive intelligence briefings via Telegram.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Frequency Selection */}
              <div className="space-y-3">
                <Label>Briefing Frequency</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "daily", label: "Daily", description: "Every morning" },
                    { value: "weekly", label: "Weekly", description: "Every Monday" },
                    { value: "none", label: "None", description: "Disabled" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDeliveryFrequency(option.value as DeliveryFrequency)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        deliveryFrequency === option.value
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              {deliveryFrequency !== "none" && (
                <div className="space-y-2">
                  <Label htmlFor="briefing-time">Briefing Time</Label>
                  <div className="flex items-center gap-4">
                    <input
                      id="briefing-time"
                      type="time"
                      value={briefingTime}
                      onChange={(e) => setBriefingTime(e.target.value)}
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">
                      Puerto Rico Time (AST)
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Content Preferences</CardTitle>
              <CardDescription>
                Choose what types of content to include in your Telegram briefings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Content Strategy Suggestions</Label>
                  <p className="text-sm text-muted-foreground">
                    AI-generated content ideas based on industry trends
                  </p>
                </div>
                <Switch
                  checked={includeContentStrategy}
                  onCheckedChange={setIncludeContentStrategy}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div className="space-y-0.5">
                  <Label>Industry Insights</Label>
                  <p className="text-sm text-muted-foreground">
                    Key takeaways from industry news and trends
                  </p>
                </div>
                <Switch
                  checked={includeInsights}
                  onCheckedChange={setIncludeInsights}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div className="space-y-0.5">
                  <Label>Event Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications about relevant industry events
                  </p>
                </div>
                <Switch
                  checked={includeEvents}
                  onCheckedChange={setIncludeEvents}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label>Make Me Smarter</Label>
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Beta
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Allow KORA to send additional relevant content for RAG enhancement
                  </p>
                </div>
                <Switch
                  checked={makeMeSmarter}
                  onCheckedChange={setMakeMeSmarter}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button>Save Telegram Preferences</Button>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Manage email and in-app notification preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Email and in-app notification settings coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account and profile settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountProfileForm />
              <p className="text-muted-foreground text-sm mt-6">
                For team and permissions, use the Users / Clients page in the dashboard.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
