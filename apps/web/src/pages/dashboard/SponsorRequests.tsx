import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ExternalLink,
  Handshake,
  Search,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { useToast } from "@/components/ui/use-toast";
import {
  buildSponsorNotesFromRequest,
  mapRequestTypesToBestFit,
  sponsorRequestStatusLabel,
  sponsorRequestTypeLabel,
  SPONSOR_REQUEST_STATUS_OPTIONS,
  type SponsorRequestStatus,
} from "@/features/sponsor-hub/constants";

type SponsorRequestRecord = {
  id: string;
  business_name: string;
  contact_name: string;
  job_title: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  industry: string | null;
  city: string | null;
  state: string | null;
  company_description: string | null;
  community_initiatives: string | null;
  sponsorship_types: string[];
  geographic_areas_served: string | null;
  annual_sponsorship_budget: string | null;
  preferred_opportunities: string | null;
  linkedin: string | null;
  logo_url: string | null;
  additional_comments: string | null;
  status: SponsorRequestStatus;
  sponsors_database_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

function statusBadgeVariant(status: SponsorRequestStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "pending_review") return "secondary";
  if (status === "rejected") return "destructive";
  return "outline";
}

export default function SponsorRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<SponsorRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<SponsorRequestRecord | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sponsor_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Could not load sponsor requests", description: error.message, variant: "destructive" });
      setRequests([]);
    } else {
      setRequests((data ?? []) as SponsorRequestRecord[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filteredRequests = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        request.business_name,
        request.contact_name,
        request.email,
        request.industry,
        request.city,
        request.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [requests, searchTerm, statusFilter]);

  const pendingCount = requests.filter((request) => request.status === "pending_review").length;

  const updateRequestStatus = async (
    request: SponsorRequestRecord,
    status: SponsorRequestStatus,
    sponsorsDatabaseId?: string | null,
  ) => {
    setActionPending(true);
    const { error } = await supabase
      .from("sponsor_requests")
      .update({
        status,
        sponsors_database_id: sponsorsDatabaseId ?? request.sponsors_database_id,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    setActionPending(false);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return false;
    }

    toast({
      title: "Request updated",
      description: `${request.business_name} marked as ${sponsorRequestStatusLabel(status)}.`,
    });
    setSelectedRequest(null);
    fetchRequests();
    return true;
  };

  const approveRequest = async (request: SponsorRequestRecord) => {
    if (request.sponsors_database_id) {
      await updateRequestStatus(request, "approved");
      return;
    }

    setActionPending(true);
    const location = [request.city, request.state].filter(Boolean).join(", ") || null;
    const { data: sponsor, error: insertError } = await supabase
      .from("sponsors_database")
      .insert({
        business_name: request.business_name,
        contact_person: request.contact_name,
        email: request.email,
        phone: request.phone,
        website: request.website,
        industry: request.industry,
        location,
        interest_level: "medium",
        best_fit_for: mapRequestTypesToBestFit(request.sponsorship_types),
        notes: buildSponsorNotesFromRequest(request),
        status: "not_contacted",
        logo_url: request.logo_url,
        source_request_id: request.id,
      })
      .select("id")
      .single();

    if (insertError || !sponsor) {
      setActionPending(false);
      toast({
        title: "Could not add to Sponsor Hub",
        description: insertError?.message ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }

    const updated = await updateRequestStatus(request, "approved", sponsor.id);
    setActionPending(false);
    if (updated) {
      toast({
        title: "Added to Sponsor Hub",
        description: `${request.business_name} was approved and added to the Strategic Sponsor Hub.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gold/20 bg-gradient-to-br from-[#F7F3EA]/80 via-background to-background p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-gold">
              <Handshake className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">Admin Only</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Sponsor Requests</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Review inbound Strategic Sponsor Hub requests from the public site. Approved organizations are added to
              the internal Sponsor Hub while the original request is preserved.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/dashboard/sponsor-hub">Open Sponsor Hub</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Pending review</p>
            <p className="text-2xl font-bold text-primary">{pendingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total requests</p>
            <p className="text-2xl font-bold text-primary">{requests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Approved</p>
            <p className="text-2xl font-bold text-primary">
              {requests.filter((request) => request.status === "approved").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {SPONSOR_REQUEST_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      Loading requests...
                    </TableCell>
                  </TableRow>
                ) : filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No sponsor requests match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{request.business_name}</p>
                          <p className="text-xs text-muted-foreground">{request.industry || "Industry not provided"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p>{request.contact_name}</p>
                          <p className="text-xs text-muted-foreground">{request.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(request.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(request.status)}>
                          {sponsorRequestStatusLabel(request.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          {selectedRequest ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedRequest.business_name}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {selectedRequest.logo_url ? (
                  <img
                    src={selectedRequest.logo_url}
                    alt={`${selectedRequest.business_name} logo`}
                    className="h-16 w-16 rounded-lg border object-contain"
                  />
                ) : null}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div><span className="font-medium">Contact:</span> {selectedRequest.contact_name}</div>
                  <div><span className="font-medium">Job title:</span> {selectedRequest.job_title || "—"}</div>
                  <div><span className="font-medium">Email:</span> {selectedRequest.email}</div>
                  <div><span className="font-medium">Phone:</span> {selectedRequest.phone || "—"}</div>
                  <div><span className="font-medium">Website:</span> {selectedRequest.website || "—"}</div>
                  <div><span className="font-medium">Location:</span> {[selectedRequest.city, selectedRequest.state].filter(Boolean).join(", ") || "—"}</div>
                </div>

                {selectedRequest.company_description ? (
                  <div>
                    <p className="font-medium">Company description</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedRequest.company_description}</p>
                  </div>
                ) : null}

                {selectedRequest.community_initiatives ? (
                  <div>
                    <p className="font-medium">Community initiatives</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedRequest.community_initiatives}</p>
                  </div>
                ) : null}

                {selectedRequest.sponsorship_types.length ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.sponsorship_types.map((type) => (
                      <Badge key={type} variant="outline">{sponsorRequestTypeLabel(type)}</Badge>
                    ))}
                  </div>
                ) : null}

                {selectedRequest.preferred_opportunities ? (
                  <div>
                    <p className="font-medium">Preferred opportunities</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedRequest.preferred_opportunities}</p>
                  </div>
                ) : null}

                {selectedRequest.additional_comments ? (
                  <div>
                    <p className="font-medium">Additional comments</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{selectedRequest.additional_comments}</p>
                  </div>
                ) : null}

                {selectedRequest.sponsors_database_id ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard/sponsor-hub">
                      View in Sponsor Hub
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={actionPending || selectedRequest.status === "archived"}
                    onClick={() => updateRequestStatus(selectedRequest, "archived")}
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={actionPending || selectedRequest.status === "rejected"}
                    onClick={() => updateRequestStatus(selectedRequest, "rejected")}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
                <Button
                  disabled={actionPending || selectedRequest.status === "approved"}
                  onClick={() => approveRequest(selectedRequest)}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve & Add to Sponsor Hub
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
