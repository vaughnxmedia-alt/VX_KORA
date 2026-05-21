import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { DOWNLOADABLE_GUIDES, getDownloadableGuide } from "@/lib/downloadableGuides";
import { SentEmailsPanel } from "@/components/dashboard/SentEmailsPanel";

type PdfDownload = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subscribed: boolean;
  source_path: string | null;
  created_at: string;
};

export function SubscriberDownloadsPanel() {
  const [guideId, setGuideId] = useState(DOWNLOADABLE_GUIDES[0]?.id ?? "making_of_a_brand");
  const guide = getDownloadableGuide(guideId);

  const { data: pdfDownloads = [], isLoading } = useQuery({
    queryKey: ["pdf-downloads", guide.id],
    queryFn: async () => {
      if (guide.table !== "making_of_a_brand_pdf_downloads") return [];
      const { data, error } = await supabase
        .from("making_of_a_brand_pdf_downloads")
        .select("id, name, email, phone, subscribed, source_path, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as PdfDownload[];
    },
  });

  const uniqueEmails = useMemo(
    () => new Set(pdfDownloads.map((row) => row.email.toLowerCase())).size,
    [pdfDownloads],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 max-w-md">
          <Label>Guide</Label>
          <Select value={guideId} onValueChange={setGuideId}>
            <SelectTrigger>
              <SelectValue placeholder="Select guide" />
            </SelectTrigger>
            <SelectContent>
              {DOWNLOADABLE_GUIDES.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.seriesLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Download className="h-5 w-5 text-gold" />
            {guide.seriesLabel}
          </CardTitle>
          <CardDescription>
            {guide.productLabel} — {pdfDownloads.length} PDF
            {pdfDownloads.length === 1 ? "" : "s"} emailed ({uniqueEmails} unique email
            {uniqueEmails === 1 ? "" : "s"}). Each row is one guide request from the site.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading downloads…</p>
          ) : pdfDownloads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No downloads for this guide yet. Requests from the guide page will appear here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Subscribed</TableHead>
                  <TableHead>Requested</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pdfDownloads.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell>{row.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={row.subscribed ? "default" : "secondary"}>
                        {row.subscribed ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(new Date(row.created_at), "MMM d, yyyy h:mm a")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Guide delivery emails</CardTitle>
          <CardDescription>Outbound emails sent for {guide.seriesLabel} PDF requests.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <SentEmailsPanel messageTypesIn={[guide.messageType]} />
        </CardContent>
      </Card>
    </div>
  );
}
