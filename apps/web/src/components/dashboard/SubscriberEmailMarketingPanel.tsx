import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Eye, Mail, Plus, Rocket, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { CtaLinkSelect } from "@/components/dashboard/CtaLinkSelect";
import { getMarketingSiteOrigin } from "@/lib/publicSite";
import {
  normalizeMarketingUrl,
  resolveCampaignCtaUrl,
  STARTER_GUIDE_HUB_URL,
} from "@/lib/subscriberMarketingLinks";
import {
  CAMPAIGN_TIMEZONE_OPTIONS,
  computeNextCampaignSendIso,
  DEFAULT_CAMPAIGN_TIMEZONE,
  formatCampaignSendPreview,
} from "@/lib/campaignSchedule";
import {
  buildBlogCampaignEmailHtml,
  buildScheduledCampaignEmailHtml,
  buildWelcomeEmailHtml,
  WELCOME_EMAIL_SUBJECT,
} from "@/lib/subscriberEmailTemplates";

type PreviewSubscriber = {
  id: string;
  name: string;
  email: string;
};

type EmailCampaign = {
  id: string;
  name: string;
  cadence: "daily" | "weekly" | "monthly" | "one_time";
  is_active: boolean;
  blog_post_id: string | null;
  subject: string | null;
  preview_line: string | null;
  custom_cta_label: string;
  custom_cta_url: string;
  use_latest_blog: boolean;
  send_time: string;
  send_day_of_week: string | null;
  last_sent_at: string | null;
  next_send_at: string | null;
  created_at: string;
};

type BlogOption = {
  id: string;
  title: string;
  slug: string | null;
  excerpt: string | null;
  description: string | null;
  cover_image_url: string | null;
};

const CADENCE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "one_time", label: "One-time" },
] as const;

const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DEFAULT_CAMPAIGN_CTA_URL = STARTER_GUIDE_HUB_URL;

async function invokeCampaign(body: Record<string, unknown>) {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Sign in to send campaigns.");

  const { data, error } = await supabase.functions.invoke("subscriber-email-campaign", {
    body,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as {
    ok?: boolean;
    sent?: number;
    failed?: number;
    total?: number;
    testMode?: boolean;
    adminNotified?: number;
    adminNotificationFailed?: number;
  };
}

function toastAfterBlast(
  data: { sent?: number; failed?: number; adminNotified?: number; adminNotificationFailed?: number },
  label: string,
) {
  const sent = data.sent ?? 0;
  const failed = data.failed ?? 0;
  const adminOk = data.adminNotified ?? 0;
  const adminFail = data.adminNotificationFailed ?? 0;

  toast.success(`${label}: ${sent} subscriber email${sent === 1 ? "" : "s"} sent.${failed > 0 ? ` ${failed} failed.` : ""}`);

  if (adminOk > 0) {
    toast.message(`Confirmation email sent to ${adminOk} dashboard address${adminOk === 1 ? "" : "es"}.`);
  } else if (adminFail > 0) {
    toast.error("Campaign sent, but the confirmation email could not be delivered. Check Sent emails in the dashboard.");
  } else {
    toast.warning(
      "Campaign sent, but no confirmation email was sent. Confirm your account email and that RESEND_API_KEY is set on Supabase.",
    );
  }
}

type Props = {
  subscriberCount: number;
  subscribers: PreviewSubscriber[];
};

export function SubscriberEmailMarketingPanel({ subscriberCount, subscribers }: Props) {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const dashboardEmail = session?.user?.email?.trim().toLowerCase() ?? "";

  const [previewSubscriberId, setPreviewSubscriberId] = useState(subscribers[0]?.id ?? "");
  const [previewTemplate, setPreviewTemplate] = useState<"welcome" | "blog" | "scheduled">("blog");

  const [blogPostId, setBlogPostId] = useState("");
  const [blogSubject, setBlogSubject] = useState("");
  const [blogCtaLabel, setBlogCtaLabel] = useState("Read this edition");
  const [blogCtaUrl, setBlogCtaUrl] = useState("");

  const [draftName, setDraftName] = useState("");
  const [draftCadence, setDraftCadence] = useState<EmailCampaign["cadence"]>("weekly");
  const [draftCtaLabel, setDraftCtaLabel] = useState("Read The Brief");
  const [draftCtaUrl, setDraftCtaUrl] = useState(DEFAULT_CAMPAIGN_CTA_URL);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftPreview, setDraftPreview] = useState("");
  const [draftBlogId, setDraftBlogId] = useState("");
  const [draftUseLatest, setDraftUseLatest] = useState(true);
  const [draftSendTime, setDraftSendTime] = useState("11:00");
  const [draftWeekday, setDraftWeekday] = useState<string>("monday");

  const { data: accountTimezone = DEFAULT_CAMPAIGN_TIMEZONE } = useQuery({
    queryKey: ["settings-profile", session?.user?.id],
    enabled: Boolean(session?.user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", session!.user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.timezone?.trim() || DEFAULT_CAMPAIGN_TIMEZONE;
    },
  });

  useEffect(() => {
    if (subscribers.length === 0) return;
    if (!previewSubscriberId || !subscribers.some((s) => s.id === previewSubscriberId)) {
      setPreviewSubscriberId(subscribers[0].id);
    }
  }, [subscribers, previewSubscriberId]);

  const previewSubscriber = useMemo(
    () => subscribers.find((s) => s.id === previewSubscriberId) ?? subscribers[0],
    [subscribers, previewSubscriberId],
  );

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["subscriber-email-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriber_email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailCampaign[];
    },
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["subscriber-campaign-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, description, cover_image_url")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data as BlogOption[];
    },
  });

  const selectedBlogPost = useMemo(
    () => blogPosts.find((p) => p.id === blogPostId),
    [blogPosts, blogPostId],
  );

  const draftBlogPost = useMemo(
    () => blogPosts.find((p) => p.id === draftBlogId),
    [blogPosts, draftBlogId],
  );

  const previewHtml = useMemo(() => {
    const name = previewSubscriber?.name ?? "there";
    if (previewTemplate === "welcome") {
      return buildWelcomeEmailHtml(name);
    }
    if (previewTemplate === "blog" && selectedBlogPost) {
      const slug = selectedBlogPost.slug ?? selectedBlogPost.id;
      const url =
        blogCtaUrl.trim() ||
        `${getMarketingSiteOrigin()}/the-brief/${encodeURIComponent(slug)}`;
      return buildBlogCampaignEmailHtml(name, selectedBlogPost, blogCtaLabel, url);
    }
    if (previewTemplate === "scheduled") {
      const post = draftUseLatest ? blogPosts[0] : draftBlogPost;
      return buildScheduledCampaignEmailHtml(
        name,
        draftName.trim() || "Campaign preview",
        draftPreview,
        draftCtaLabel,
        resolveCampaignCtaUrl(draftCtaUrl, draftName),
        post ?? null,
      );
    }
    return buildWelcomeEmailHtml(name);
  }, [
    previewSubscriber,
    previewTemplate,
    selectedBlogPost,
    blogCtaLabel,
    blogCtaUrl,
    draftName,
    draftPreview,
    draftCtaLabel,
    draftCtaUrl,
    draftUseLatest,
    draftBlogPost,
    blogPosts,
  ]);

  const previewSubject = useMemo(() => {
    if (previewTemplate === "welcome") return WELCOME_EMAIL_SUBJECT;
    if (previewTemplate === "blog" && selectedBlogPost) {
      return blogSubject.trim() || `New on The Brief: ${selectedBlogPost.title}`;
    }
    if (previewTemplate === "scheduled") {
      const post = draftUseLatest ? blogPosts[0] : draftBlogPost;
      return draftSubject.trim() || (post ? `The Brief: ${post.title}` : "Updates from JahKnowsPR");
    }
    return WELCOME_EMAIL_SUBJECT;
  }, [previewTemplate, selectedBlogPost, blogSubject, draftSubject, draftUseLatest, draftBlogPost, blogPosts]);

  const publishDisabledReason = useMemo(() => {
    if (subscriberCount === 0) return "No subscribers to email.";
    if (previewTemplate === "welcome") return "Welcome emails send automatically on subscribe.";
    if (previewTemplate === "blog" && !blogPostId) return "Select a Brief post to publish.";
    if (previewTemplate === "scheduled" && !draftName.trim()) return "Enter a campaign name.";
    return null;
  }, [subscriberCount, previewTemplate, blogPostId, draftName]);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (previewTemplate === "blog") {
        if (!blogPostId) throw new Error("Select a blog post.");
        return invokeCampaign({
          action: "send_blog",
          blogPostId,
          subject: blogSubject.trim() || undefined,
          ctaLabel: blogCtaLabel.trim() || undefined,
          ctaUrl: blogCtaUrl.trim() || undefined,
        });
      }
      if (previewTemplate === "scheduled") {
        if (!draftName.trim()) throw new Error("Campaign name is required.");
        return invokeCampaign({
          action: "send_custom",
          campaignName: draftName.trim(),
          subject: draftSubject.trim() || undefined,
          previewLine: draftPreview.trim() || undefined,
          ctaLabel: draftCtaLabel.trim() || undefined,
          ctaUrl: draftCtaUrl.trim() || undefined,
          blogPostId: draftUseLatest ? undefined : draftBlogId || undefined,
          useLatestBlog: draftUseLatest,
        });
      }
      throw new Error("Welcome emails cannot be published from here.");
    },
    onSuccess: (data) => {
      toastAfterBlast(data, "Published");
      queryClient.invalidateQueries({ queryKey: ["outbound-email-logs"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testEmailMutation = useMutation({
    mutationFn: async () => {
      if (!dashboardEmail) throw new Error("Your account has no email for test sends.");
      if (previewTemplate === "welcome") {
        return invokeCampaign({ action: "send_test_welcome", testEmail: dashboardEmail });
      }
      if (previewTemplate === "blog") {
        if (!blogPostId) throw new Error("Select a blog post.");
        return invokeCampaign({
          action: "send_blog",
          blogPostId,
          subject: blogSubject.trim() || undefined,
          ctaLabel: blogCtaLabel.trim() || undefined,
          ctaUrl: blogCtaUrl.trim() || undefined,
          testEmail: dashboardEmail,
        });
      }
      return invokeCampaign({
        action: "send_custom",
        testEmail: dashboardEmail,
        campaignName: draftName.trim() || "Campaign preview",
        subject: draftSubject.trim() || undefined,
        previewLine: draftPreview.trim() || undefined,
        ctaLabel: draftCtaLabel.trim() || undefined,
        ctaUrl: draftCtaUrl.trim() || undefined,
        blogPostId: draftUseLatest ? undefined : draftBlogId || undefined,
        useLatestBlog: draftUseLatest,
      });
    },
    onSuccess: () => {
      toast.success(`Test email sent to ${dashboardEmail}.`);
      queryClient.invalidateQueries({ queryKey: ["outbound-email-logs"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const createCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!draftName.trim()) throw new Error("Campaign name is required.");
      const nextSend = await computeNextCampaignSendIso(
        draftCadence,
        draftSendTime,
        draftCadence === "weekly" ? draftWeekday : null,
        accountTimezone,
      );
      const { error } = await supabase.from("subscriber_email_campaigns").insert({
        name: draftName.trim(),
        cadence: draftCadence,
        is_active: false,
        blog_post_id: draftBlogId || null,
        subject: draftSubject.trim() || null,
        preview_line: draftPreview.trim() || null,
        custom_cta_label: draftCtaLabel.trim() || "Read The Brief",
        custom_cta_url: normalizeMarketingUrl(draftCtaUrl.trim() || DEFAULT_CAMPAIGN_CTA_URL),
        use_latest_blog: draftUseLatest,
        send_time: draftSendTime.length === 5 ? `${draftSendTime}:00` : draftSendTime,
        send_day_of_week: draftCadence === "weekly" ? draftWeekday : null,
        next_send_at: nextSend,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign saved.");
      setDraftName("");
      queryClient.invalidateQueries({ queryKey: ["subscriber-email-campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleCampaignMutation = useMutation({
    mutationFn: async ({ id, is_active, cadence, send_time, send_day_of_week }: EmailCampaign) => {
      const next_send_at = is_active
        ? null
        : await computeNextCampaignSendIso(
            cadence,
            send_time.slice(0, 5),
            send_day_of_week,
            accountTimezone,
          );
      const { error } = await supabase
        .from("subscriber_email_campaigns")
        .update({ is_active: !is_active, next_send_at })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscriber-email-campaigns"] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) =>
      invokeCampaign({ action: "send_campaign", campaignId }),
    onSuccess: (data) => {
      toastAfterBlast(data, "Send now");
      queryClient.invalidateQueries({ queryKey: ["subscriber-email-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["outbound-email-logs"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscriber_email_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campaign removed.");
      queryClient.invalidateQueries({ queryKey: ["subscriber-email-campaigns"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleBlogPostPick = (postId: string) => {
    setBlogPostId(postId);
    setPreviewTemplate("blog");
    const post = blogPosts.find((p) => p.id === postId);
    if (post?.slug) {
      const url = `${getMarketingSiteOrigin()}/the-brief/${encodeURIComponent(post.slug)}`;
      setBlogCtaUrl(url);
    }
  };

  const isSending = publishMutation.isPending || testEmailMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-gold" />
            Compose campaign
          </CardTitle>
          <CardDescription>
            Configure a blog blast or custom message. Preview and publish at the bottom.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Campaign type</Label>
            <Select
              value={previewTemplate}
              onValueChange={(v) => setPreviewTemplate(v as typeof previewTemplate)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blog">Blog update (The Brief)</SelectItem>
                <SelectItem value="scheduled">Custom / scheduled message</SelectItem>
                <SelectItem value="welcome">Welcome (preview only)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {previewTemplate === "blog" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Blog post (The Brief)</Label>
                <Select value={blogPostId} onValueChange={handleBlogPostPick}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select published post" />
                  </SelectTrigger>
                  <SelectContent>
                    {blogPosts.map((post) => (
                      <SelectItem key={post.id} value={post.id}>
                        {post.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Email subject (optional)</Label>
                <Input
                  value={blogSubject}
                  onChange={(e) => setBlogSubject(e.target.value)}
                  placeholder="New on The Brief: …"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA button label</Label>
                <Input value={blogCtaLabel} onChange={(e) => setBlogCtaLabel(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>CTA link</Label>
                <CtaLinkSelect
                  value={blogCtaUrl}
                  onValueChange={(url, opt) => {
                    setBlogCtaUrl(url);
                    if (opt?.defaultCtaLabel) setBlogCtaLabel(opt.defaultCtaLabel);
                  }}
                  blogPosts={blogPosts}
                />
              </div>
            </div>
          ) : previewTemplate === "scheduled" ? (
            <div className="grid gap-3 sm:grid-cols-2 rounded-xl border p-4 bg-muted/20">
              <div className="space-y-2 sm:col-span-2">
                <Label>Campaign name</Label>
                <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Weekly Brief digest" />
              </div>
              <div className="space-y-2">
                <Label>Subject (optional)</Label>
                <Input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Preview line (optional)</Label>
                <Input value={draftPreview} onChange={(e) => setDraftPreview(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CTA label</Label>
                <Input value={draftCtaLabel} onChange={(e) => setDraftCtaLabel(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CTA link</Label>
                <CtaLinkSelect
                  value={draftCtaUrl}
                  onValueChange={(url, opt) => {
                    setDraftCtaUrl(url);
                    if (opt?.defaultCtaLabel) setDraftCtaLabel(opt.defaultCtaLabel);
                  }}
                  blogPosts={blogPosts}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch checked={draftUseLatest} onCheckedChange={setDraftUseLatest} id="use-latest-compose" />
                <Label htmlFor="use-latest-compose">Include latest Brief post in email</Label>
              </div>
              {!draftUseLatest ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Fixed Brief post</Label>
                  <Select value={draftBlogId} onValueChange={setDraftBlogId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional fixed post" />
                    </SelectTrigger>
                    <SelectContent>
                      {blogPosts.map((post) => (
                        <SelectItem key={post.id} value={post.id}>
                          {post.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground rounded-lg border p-4 bg-muted/20">
              Welcome emails are sent automatically when someone subscribes via Stay Informed. Use preview below to review the template; send a test to your inbox.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-gold" />
            Saved schedules
          </CardTitle>
          <CardDescription>
            Daily, weekly, or monthly automations in{" "}
            {CAMPAIGN_TIMEZONE_OPTIONS.find((t) => t.value === accountTimezone)?.label ?? "Central Time"}.
            Active campaigns email all admins a confirmation when a blast sends. Change timezone in Account settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border p-4 space-y-4 bg-muted/20">
            <p className="text-sm font-medium">Save recurring schedule</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Weekly Brief digest" />
              </div>
              <div className="space-y-2">
                <Label>Cadence</Label>
                <Select value={draftCadence} onValueChange={(v) => setDraftCadence(v as EmailCampaign["cadence"])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CADENCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Send time ({accountTimezone.replace("America/", "").replace("_", " ")})</Label>
                <Input type="time" value={draftSendTime} onChange={(e) => setDraftSendTime(e.target.value)} />
              </div>
              {draftCadence === "weekly" ? (
                <div className="space-y-2">
                  <Label>Day of week</Label>
                  <Select value={draftWeekday} onValueChange={setDraftWeekday}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAYS.map((day) => (
                        <SelectItem key={day} value={day}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
            <Button
              variant="outline"
              onClick={() => createCampaignMutation.mutate()}
              disabled={createCampaignMutation.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Save schedule
            </Button>
          </div>

          {campaignsLoading ? (
            <p className="text-sm text-muted-foreground">Loading campaigns…</p>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved schedules yet.</p>
          ) : (
            <ul className="space-y-3">
              {campaigns.map((campaign) => (
                <li
                  key={campaign.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{campaign.name}</span>
                      <Badge variant="outline">{campaign.cadence}</Badge>
                      {campaign.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Paused</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      CTA: {campaign.custom_cta_label} →{" "}
                      {resolveCampaignCtaUrl(campaign.custom_cta_url, campaign.name)}
                    </p>
                    {campaign.next_send_at && campaign.is_active ? (
                      <p className="text-xs text-muted-foreground">
                        Next send {formatCampaignSendPreview(campaign.next_send_at, accountTimezone)}
                      </p>
                    ) : null}
                    {campaign.last_sent_at ? (
                      <p className="text-xs text-muted-foreground">
                        Last sent {formatCampaignSendPreview(campaign.last_sent_at, accountTimezone)}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Switch
                      checked={campaign.is_active}
                      onCheckedChange={() => toggleCampaignMutation.mutate(campaign)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendCampaignMutation.mutate(campaign.id)}
                      disabled={sendCampaignMutation.isPending || subscriberCount === 0}
                    >
                      Send now
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Eye className="h-5 w-5 text-gold" />
            Preview & publish
          </CardTitle>
          <CardDescription>
            Review the email, then publish to all {subscriberCount} subscribers or send a test to your dashboard account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Preview as subscriber</Label>
              <Select
                value={previewSubscriber?.id ?? ""}
                onValueChange={setPreviewSubscriberId}
                disabled={subscribers.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subscriber" />
                </SelectTrigger>
                <SelectContent>
                  {subscribers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · {s.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex flex-col justify-end">
              <p className="text-xs text-muted-foreground">Subject: {previewSubject}</p>
              {dashboardEmail ? (
                <p className="text-xs text-muted-foreground">Test sends to: {dashboardEmail}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <iframe
              title="Subscriber campaign email preview"
              className="h-96 w-full rounded-xl border bg-white"
              sandbox=""
              srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0;font-family:system-ui,sans-serif;font-size:14px;">${previewHtml}</body></html>`}
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border p-4 bg-muted/30">
            <div className="text-sm text-muted-foreground">
              {publishDisabledReason ?? `Ready to email ${subscriberCount} subscribers.`}
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Button
                variant="outline"
                onClick={() => testEmailMutation.mutate()}
                disabled={isSending || !dashboardEmail || (previewTemplate === "blog" && !blogPostId)}
              >
                <Mail className="h-4 w-4 mr-2" />
                {testEmailMutation.isPending ? "Sending test…" : "Send test email"}
              </Button>
              <Button
                onClick={() => publishMutation.mutate()}
                disabled={isSending || Boolean(publishDisabledReason)}
              >
                <Rocket className="h-4 w-4 mr-2" />
                {publishMutation.isPending ? "Publishing…" : "Publish campaign"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
