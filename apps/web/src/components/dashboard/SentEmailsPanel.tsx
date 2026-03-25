import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

export type OutboundEmailLogRow = {
  id: string;
  created_at: string;
  message_type: string;
  from_email: string;
  to_email: string;
  subject: string;
  status: "queued" | "sent" | "failed";
  provider_message_id: string | null;
  error_message: string | null;
  body_html: string | null;
  body_text: string | null;
};

type Props = {
  /** Server-side filter: only load rows whose `message_type` is in this list */
  messageTypesIn: string[];
};

export function SentEmailsPanel({ messageTypesIn }: Props) {
  const [recipientSearch, setRecipientSearch] = useState("");
  const [messageType, setMessageType] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selected, setSelected] = useState<OutboundEmailLogRow | null>(null);

  const sortedTypesKey = [...messageTypesIn].sort().join(",");

  const { data: emailLogs, isLoading, error } = useQuery({
    queryKey: ["outbound-email-logs", sortedTypesKey],
    queryFn: async () => {
      let q = supabase
        .from("outbound_email_logs")
        .select(
          "id, created_at, message_type, from_email, to_email, subject, status, provider_message_id, error_message, body_html, body_text",
        )
        .order("created_at", { ascending: false })
        .limit(300);

      if (messageTypesIn.length === 1) {
        q = q.eq("message_type", messageTypesIn[0]);
      } else if (messageTypesIn.length > 1) {
        q = q.in("message_type", messageTypesIn);
      }

      const { data, error: err } = await q;
      if (err) throw err;
      return (data ?? []) as OutboundEmailLogRow[];
    },
  });

  const filteredLogs = useMemo(() => {
    const q = recipientSearch.trim().toLowerCase();
    return (emailLogs ?? []).filter((row) => {
      if (messageType !== "all" && row.message_type !== messageType) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (dateFrom) {
        const fromDate = new Date(`${dateFrom}T00:00:00.000Z`);
        if (new Date(row.created_at) < fromDate) return false;
      }
      if (dateTo) {
        const toDate = new Date(`${dateTo}T23:59:59.999Z`);
        if (new Date(row.created_at) > toDate) return false;
      }
      if (!q) return true;
      const blob = `${row.to_email} ${row.from_email} ${row.subject}`.toLowerCase();
      return blob.includes(q);
    });
  }, [emailLogs, messageType, statusFilter, dateFrom, dateTo, recipientSearch]);

  const messageTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const t of messageTypesIn) seen.add(t);
    for (const row of emailLogs ?? []) seen.add(row.message_type);
    return [...seen].filter((t) => messageTypesIn.includes(t)).sort((a, b) => a.localeCompare(b));
  }, [emailLogs, messageTypesIn]);

  const showMessageTypeFilter = messageTypesIn.length > 1;

  const iframeDoc = selected?.body_html
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0;font-family:system-ui,sans-serif;font-size:14px;">${selected.body_html}</body></html>`
    : "";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Sent emails</CardTitle>
          <CardDescription>
            See exactly what left our system via Resend: From, To, delivery status, and content. Use this
            while you verify DNS and that messages go out from your intended domain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Input
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Search recipient, from, or subject"
            />
            {showMessageTypeFilter ? (
              <Select value={messageType} onValueChange={setMessageType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {messageTypeOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="hidden lg:block" aria-hidden />
            )}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading sent emails…</p>
          ) : error ? (
            <p className="text-sm text-destructive">Could not load sent emails.</p>
          ) : filteredLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sent emails match your filters.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelected(row)}
                    >
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(row.created_at), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-sm">{row.to_email}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm">{row.subject}</TableCell>
                      <TableCell className="max-w-[200px] truncate font-mono text-sm">{row.from_email}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "failed" ? "destructive" : "secondary"}>{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email details</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">From</dt>
                  <dd className="font-mono">{selected.from_email}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">To</dt>
                  <dd className="font-mono">{selected.to_email}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">Subject</dt>
                  <dd>{selected.subject}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={selected.status === "failed" ? "destructive" : "secondary"}>
                      {selected.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Type</dt>
                  <dd className="font-mono text-xs">{selected.message_type}</dd>
                </div>
                {selected.provider_message_id ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-muted-foreground">Resend message id</dt>
                    <dd className="break-all font-mono text-xs">{selected.provider_message_id}</dd>
                  </div>
                ) : null}
                {selected.error_message ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-destructive">Error</dt>
                    <dd className="text-destructive">{selected.error_message}</dd>
                  </div>
                ) : null}
              </dl>

              <Tabs defaultValue="preview">
                <TabsList>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                  <TabsTrigger value="text">Plain text</TabsTrigger>
                </TabsList>
                <TabsContent value="preview" className="mt-2">
                  {selected.body_html ? (
                    <iframe
                      title="Email preview"
                      className="h-[min(420px,50vh)] w-full rounded-md border bg-background"
                      sandbox=""
                      srcDoc={iframeDoc}
                    />
                  ) : (
                    <p className="text-muted-foreground">No HTML body stored.</p>
                  )}
                </TabsContent>
                <TabsContent value="text" className="mt-2">
                  <pre className="max-h-[min(420px,50vh)] overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                    {selected.body_text || "—"}
                  </pre>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
