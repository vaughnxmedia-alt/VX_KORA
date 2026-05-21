import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SubscriberDownloadsPanel } from "@/components/dashboard/SubscriberDownloadsPanel";
import { SubscriberEmailMarketingPanel } from "@/components/dashboard/SubscriberEmailMarketingPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BookOpen, Mail, Send, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Subscriber = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  email_sent: boolean;
  lead_source: { source?: string } | null;
};

type SubscriberEmailPreview = {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  fromEmail: string;
  toEmail: string;
  status: "queued" | "sent" | "failed" | "template";
  messageType: string;
  createdAt: string | null;
  errorMessage: string | null;
};

const THE_BRIEF_URL = "https://www.jahknowspr.com/the-brief";

function buildDefaultSubscriberTemplate(name: string, email: string): SubscriberEmailPreview {
  const normalizedName = name.trim() || "there";
  const subject = "Thank you for subscribing";
  const bodyHtml = `
    <body style="margin:0;background:#F7F3EA;padding:28px 12px;font-family:Arial,sans-serif;color:#0A1A35;line-height:1.6;">
      <div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #E8DFC8;border-radius:24px;overflow:hidden;">
        <div style="height:8px;background:#0A1A35;"></div>
        <div style="padding:34px 32px 28px;">
          <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.28em;text-transform:uppercase;color:#8C6C27;font-weight:700;">JahKnowsPR Firm</p>
          <h1 style="font-family:Georgia,serif;margin:0 0 18px;font-size:36px;line-height:1.05;color:#0A1A35;">Thank you for subscribing.</h1>
          <p style="margin:0 0 14px;">Hi ${normalizedName},</p>
          <p style="margin:0 0 14px;">
            You're on our list. <strong>The Brief</strong> is live — we'll email you when new strategic editions are ready.
          </p>
          <p style="margin:0 0 18px;">
            <a href="${THE_BRIEF_URL}" style="display:inline-block;background:#0A1A35;color:#fff;padding:13px 20px;border-radius:999px;text-decoration:none;font-weight:700;">
              Explore The Brief
            </a>
          </p>
          <p style="margin:24px 0 0;font-size:12px;color:#666;">JahKnowsPR Firm</p>
        </div>
      </div>
    </body>
  `;
  const bodyText = bodyHtml
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    subject,
    bodyHtml,
    bodyText,
    fromEmail: "welcome@jahknowspr.com",
    toEmail: email,
    status: "template",
    messageType: "subscriber_verification",
    createdAt: null,
    errorMessage: null,
  };
}

function isBrandFoundationLead(leadSource: Subscriber["lead_source"]): boolean {
  if (!leadSource || typeof leadSource !== "object") return false;
  const source = String(leadSource.source ?? "").toLowerCase();
  return source.includes("before_you_build") || source.includes("brand_foundation");
}

export default function Subscribers() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [previewTarget, setPreviewTarget] = useState<Subscriber | null>(null);
  const [previewEmail, setPreviewEmail] = useState<SubscriberEmailPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const { data: subscribers, isLoading, error } = useQuery({
    queryKey: ["subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscribers")
        .select("id, name, email, created_at, email_sent, lead_source")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Subscriber[];
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subscriber removed from The Brief.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["outbound-email-logs"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not delete subscriber"),
  });

  const openSubscriberPreview = async (subscriber: Subscriber) => {
    setPreviewTarget(subscriber);
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase
        .from("outbound_email_logs")
        .select("subject, body_html, body_text, from_email, to_email, status, message_type, created_at, error_message")
        .eq("message_type", "subscriber_verification")
        .eq("to_email", subscriber.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const template = buildDefaultSubscriberTemplate(subscriber.name, subscriber.email);
        setPreviewEmail({
          subject: data.subject || template.subject,
          bodyHtml: template.bodyHtml,
          bodyText: template.bodyText,
          fromEmail: data.from_email || template.fromEmail,
          toEmail: data.to_email || subscriber.email,
          status: (data.status as SubscriberEmailPreview["status"]) || "queued",
          messageType: data.message_type || "subscriber_verification",
          createdAt: data.created_at || null,
          errorMessage: data.error_message || null,
        });
      } else {
        setPreviewEmail(buildDefaultSubscriberTemplate(subscriber.name, subscriber.email));
      }
    } catch (err) {
      console.error("Failed loading subscriber email preview", err);
      setPreviewEmail(buildDefaultSubscriberTemplate(subscriber.name, subscriber.email));
      toast.error("Showing default template preview because log data could not be loaded.");
    } finally {
      setPreviewLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error loading subscribers.</p>
      </div>
    );
  }

  const total = subscribers?.length || 0;
  const welcomedCount = subscribers?.filter((s) => s.email_sent).length || 0;
  const { data: pdfDownloadCount = 0 } = useQuery({
    queryKey: ["making-of-a-brand-pdf-downloads-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("making_of_a_brand_pdf_downloads")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary">Subscribers</h1>
        <p className="text-muted-foreground">
          Email marketing for The Brief — welcome sends, blog blasts, and scheduled campaigns
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Welcome emails sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{welcomedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Making of a Brand PDFs</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pdfDownloadCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="marketing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="marketing">Email marketing</TabsTrigger>
          <TabsTrigger value="subscribers">Subscriber list</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
        </TabsList>

        <TabsContent value="marketing">
          <SubscriberEmailMarketingPanel
            subscriberCount={total}
            subscribers={(subscribers ?? []).map((s) => ({
              id: s.id,
              name: s.name,
              email: s.email,
            }))}
          />
        </TabsContent>

        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle>All subscribers</CardTitle>
            </CardHeader>
            <CardContent>
              {subscribers?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No subscribers yet. Stay Informed on the site will collect emails.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Subscribed</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="w-12 pr-2 text-right">
                        <span className="sr-only">Remove</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers?.map((subscriber) => (
                      <TableRow
                        key={subscriber.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => void openSubscriberPreview(subscriber)}
                      >
                        <TableCell className="font-medium">{subscriber.name}</TableCell>
                        <TableCell>{subscriber.email}</TableCell>
                        <TableCell>{format(new Date(subscriber.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {isBrandFoundationLead(subscriber.lead_source)
                              ? "Making of a Brand"
                              : "The Brief"}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-2 text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8 shrink-0"
                            aria-label="Remove subscriber"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteTarget(subscriber);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="downloads">
          <SubscriberDownloadsPanel />
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!previewTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewTarget(null);
            setPreviewEmail(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Welcome email preview</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <p className="text-sm text-muted-foreground">Loading email preview...</p>
          ) : previewTarget && previewEmail ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={previewEmail.status === "failed" ? "destructive" : "secondary"}>
                    {previewEmail.status === "template" ? "Template Preview" : previewEmail.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    To {previewEmail.toEmail}
                    {previewEmail.createdAt
                      ? ` · Last sent ${format(new Date(previewEmail.createdAt), "MMM d, yyyy h:mm a")}`
                      : ""}
                  </span>
                </div>
                <iframe
                  title="Subscriber email preview"
                  className="h-96 w-full rounded-xl border bg-white"
                  sandbox=""
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0;font-family:system-ui,sans-serif;font-size:14px;">${previewEmail.bodyHtml}</body></html>`}
                />
                <p className="mt-3 text-xs text-muted-foreground">Subject: {previewEmail.subject}</p>
                {previewEmail.errorMessage ? (
                  <p className="mt-1 text-xs text-destructive">{previewEmail.errorMessage}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscriber?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.email || "this subscriber"} from The Brief list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubscriberMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                deleteSubscriberMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteSubscriberMutation.isPending}
            >
              {deleteSubscriberMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
