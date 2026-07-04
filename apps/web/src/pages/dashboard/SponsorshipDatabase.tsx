import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import {
  Building2,
  Edit3,
  Handshake,
  Inbox,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

type InterestLevel = "high" | "medium" | "low";
type SponsorStatus =
  | "not_contacted"
  | "contacted"
  | "interested"
  | "follow_up_needed"
  | "declined"
  | "sponsored";

type BestFitKey =
  | "events"
  | "nonprofits"
  | "community_programs"
  | "youth_programs"
  | "arts_culture"
  | "business_events"
  | "other";

type SponsorRecord = {
  id: string;
  business_name: string;
  industry: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  location: string | null;
  interest_level: InterestLevel;
  best_fit_for: BestFitKey[];
  notes: string | null;
  status: SponsorStatus;
  last_contact_date: string | null;
  next_follow_up_date: string | null;
  created_at: string;
  updated_at: string;
};

const INTEREST_LEVELS: { value: InterestLevel; label: string }[] = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_OPTIONS: { value: SponsorStatus; label: string }[] = [
  { value: "not_contacted", label: "Not Contacted" },
  { value: "contacted", label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "follow_up_needed", label: "Follow-Up Needed" },
  { value: "declined", label: "Declined" },
  { value: "sponsored", label: "Sponsored" },
];

const BEST_FIT_OPTIONS: { value: BestFitKey; label: string }[] = [
  { value: "events", label: "Events" },
  { value: "nonprofits", label: "Nonprofits" },
  { value: "community_programs", label: "Community Programs" },
  { value: "youth_programs", label: "Youth Programs" },
  { value: "arts_culture", label: "Arts/Culture" },
  { value: "business_events", label: "Business Events" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM = {
  business_name: "",
  industry: "",
  contact_person: "",
  email: "",
  phone: "",
  website: "",
  location: "",
  interest_level: "medium" as InterestLevel,
  best_fit_for: [] as BestFitKey[],
  notes: "",
  status: "not_contacted" as SponsorStatus,
  last_contact_date: "",
  next_follow_up_date: "",
};

function interestLabel(value: InterestLevel) {
  return INTEREST_LEVELS.find((item) => item.value === value)?.label ?? value;
}

function statusLabel(value: SponsorStatus) {
  return STATUS_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function bestFitLabel(value: BestFitKey) {
  return BEST_FIT_OPTIONS.find((item) => item.value === value)?.label ?? value;
}

function interestBadgeVariant(value: InterestLevel): "default" | "secondary" | "outline" {
  if (value === "high") return "default";
  if (value === "medium") return "secondary";
  return "outline";
}

function statusBadgeVariant(value: SponsorStatus): "default" | "secondary" | "destructive" | "outline" {
  if (value === "sponsored") return "default";
  if (value === "interested") return "secondary";
  if (value === "declined") return "destructive";
  if (value === "follow_up_needed") return "outline";
  return "outline";
}

function formatDate(value: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return value;
  }
}

export default function SponsorshipDatabase() {
  const { toast } = useToast();
  const [sponsors, setSponsors] = useState<SponsorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<SponsorRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [interestFilter, setInterestFilter] = useState("all");
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchSponsors = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("sponsors_database")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({
        title: "Could not load sponsors",
        description: error.message,
        variant: "destructive",
      });
      setSponsors([]);
    } else {
      setSponsors((data ?? []) as SponsorRecord[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchSponsors();
  }, [fetchSponsors]);

  const industryOptions = useMemo(
    () =>
      [...new Set(sponsors.map((s) => s.industry?.trim()).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [sponsors],
  );

  const locationOptions = useMemo(
    () =>
      [...new Set(sponsors.map((s) => s.location?.trim()).filter(Boolean) as string[])].sort((a, b) =>
        a.localeCompare(b),
      ),
    [sponsors],
  );

  const filteredSponsors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return sponsors.filter((sponsor) => {
      if (industryFilter !== "all" && sponsor.industry !== industryFilter) return false;
      if (locationFilter !== "all" && sponsor.location !== locationFilter) return false;
      if (statusFilter !== "all" && sponsor.status !== statusFilter) return false;
      if (interestFilter !== "all" && sponsor.interest_level !== interestFilter) return false;
      if (!query) return true;

      const haystack = [
        sponsor.business_name,
        sponsor.industry,
        sponsor.contact_person,
        sponsor.email,
        sponsor.phone,
        sponsor.website,
        sponsor.location,
        sponsor.notes,
        ...sponsor.best_fit_for.map(bestFitLabel),
        statusLabel(sponsor.status),
        interestLabel(sponsor.interest_level),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [sponsors, searchTerm, industryFilter, locationFilter, statusFilter, interestFilter]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedSponsor(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (sponsor: SponsorRecord) => {
    setSelectedSponsor(sponsor);
    setForm({
      business_name: sponsor.business_name,
      industry: sponsor.industry ?? "",
      contact_person: sponsor.contact_person ?? "",
      email: sponsor.email ?? "",
      phone: sponsor.phone ?? "",
      website: sponsor.website ?? "",
      location: sponsor.location ?? "",
      interest_level: sponsor.interest_level,
      best_fit_for: sponsor.best_fit_for ?? [],
      notes: sponsor.notes ?? "",
      status: sponsor.status,
      last_contact_date: sponsor.last_contact_date ?? "",
      next_follow_up_date: sponsor.next_follow_up_date ?? "",
    });
    setIsDialogOpen(true);
  };

  const toggleBestFit = (value: BestFitKey, checked: boolean) => {
    setForm((current) => ({
      ...current,
      best_fit_for: checked
        ? [...current.best_fit_for, value]
        : current.best_fit_for.filter((item) => item !== value),
    }));
  };

  const handleDelete = async (sponsor: SponsorRecord) => {
    if (!window.confirm(`Delete ${sponsor.business_name}? This cannot be undone.`)) return;

    const { error } = await supabase.from("sponsors_database").delete().eq("id", sponsor.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Sponsor deleted" });
    fetchSponsors();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.business_name.trim()) {
      toast({
        title: "Business name required",
        description: "Enter the sponsor organization name before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const payload = {
      business_name: form.business_name.trim(),
      industry: form.industry.trim() || null,
      contact_person: form.contact_person.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      location: form.location.trim() || null,
      interest_level: form.interest_level,
      best_fit_for: form.best_fit_for,
      notes: form.notes.trim() || null,
      status: form.status,
      last_contact_date: form.last_contact_date || null,
      next_follow_up_date: form.next_follow_up_date || null,
    };

    const response = selectedSponsor
      ? await supabase.from("sponsors_database").update(payload).eq("id", selectedSponsor.id)
      : await supabase.from("sponsors_database").insert(payload);

    setIsSaving(false);

    if (response.error) {
      toast({
        title: selectedSponsor ? "Update failed" : "Create failed",
        description: response.error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: selectedSponsor ? "Sponsor updated" : "Sponsor added",
      description: `${payload.business_name} saved to the sponsorship database.`,
    });
    setIsDialogOpen(false);
    resetForm();
    fetchSponsors();
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
            <h1 className="text-3xl font-bold tracking-tight text-primary">Sponsorship Database</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Use this database to track potential sponsorship partners for JahKnowsPR Firm clients, events,
              nonprofit initiatives, and future strategic partnerships.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button variant="outline" asChild>
              <Link to="/dashboard/sponsor-requests">
                <Inbox className="mr-2 h-4 w-4" />
                Sponsor Requests
              </Link>
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Sponsor
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total sponsors</p>
              <p className="text-2xl font-bold text-primary">{sponsors.length}</p>
            </div>
            <Building2 className="h-8 w-8 text-primary/20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">High interest</p>
              <p className="text-2xl font-bold text-primary">
                {sponsors.filter((s) => s.interest_level === "high").length}
              </p>
            </div>
            <Handshake className="h-8 w-8 text-primary/20" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Follow-up needed</p>
              <p className="text-2xl font-bold text-primary">
                {sponsors.filter((s) => s.status === "follow_up_needed").length}
              </p>
            </div>
            <Search className="h-8 w-8 text-primary/20" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sponsors..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All industries</SelectItem>
                {industryOptions.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {locationOptions.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={interestFilter} onValueChange={setInterestFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Interest" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All interest levels</SelectItem>
                {INTEREST_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
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
                  <TableHead>Location</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      Loading sponsors...
                    </TableCell>
                  </TableRow>
                ) : filteredSponsors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      No sponsors match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSponsors.map((sponsor) => (
                    <TableRow key={sponsor.id}>
                      <TableCell className="min-w-[180px]">
                        <div className="space-y-1">
                          <p className="font-medium">{sponsor.business_name}</p>
                          <p className="text-xs text-muted-foreground">{sponsor.industry || "Industry not set"}</p>
                          {sponsor.best_fit_for.length ? (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {sponsor.best_fit_for.slice(0, 2).map((fit) => (
                                <Badge key={fit} variant="outline" className="text-[10px]">
                                  {bestFitLabel(fit)}
                                </Badge>
                              ))}
                              {sponsor.best_fit_for.length > 2 ? (
                                <Badge variant="outline" className="text-[10px]">
                                  +{sponsor.best_fit_for.length - 2}
                                </Badge>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[160px]">
                        <div className="space-y-1 text-sm">
                          <p>{sponsor.contact_person || "—"}</p>
                          <p className="text-xs text-muted-foreground">{sponsor.email || "No email"}</p>
                          <p className="text-xs text-muted-foreground">{sponsor.phone || "No phone"}</p>
                        </div>
                      </TableCell>
                      <TableCell>{sponsor.location || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={interestBadgeVariant(sponsor.interest_level)}>
                          {interestLabel(sponsor.interest_level)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(sponsor.status)}>{statusLabel(sponsor.status)}</Badge>
                      </TableCell>
                      <TableCell>{formatDate(sponsor.next_follow_up_date)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(sponsor)}>
                              <Edit3 className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(sponsor)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSponsor ? "Edit Sponsor" : "Add Sponsor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="business_name">Business / Organization Name *</Label>
                <Input
                  id="business_name"
                  value={form.business_name}
                  onChange={(event) => setForm((current) => ({ ...current, business_name: event.target.value }))}
                  placeholder="Acme Community Foundation"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={form.industry}
                  onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                  placeholder="Healthcare, Arts, Finance..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Beaumont, TX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  value={form.contact_person}
                  onChange={(event) => setForm((current) => ({ ...current, contact_person: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
                  placeholder="https://example.org"
                />
              </div>
              <div className="space-y-2">
                <Label>Sponsorship Interest Level</Label>
                <Select
                  value={form.interest_level}
                  onValueChange={(value: InterestLevel) =>
                    setForm((current) => ({ ...current, interest_level: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEREST_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(value: SponsorStatus) => setForm((current) => ({ ...current, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_contact_date">Last Contact Date</Label>
                <Input
                  id="last_contact_date"
                  type="date"
                  value={form.last_contact_date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, last_contact_date: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_follow_up_date">Next Follow-Up Date</Label>
                <Input
                  id="next_follow_up_date"
                  type="date"
                  value={form.next_follow_up_date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, next_follow_up_date: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Best Fit For</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {BEST_FIT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={form.best_fit_for.includes(option.value)}
                      onCheckedChange={(checked) => toggleBestFit(option.value, checked === true)}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                rows={4}
                placeholder="Relationship context, preferred sponsorship types, intro path, etc."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : selectedSponsor ? "Save Changes" : "Add Sponsor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
