import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Handshake, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  SPONSOR_REQUEST_DISCLAIMER,
  SPONSORSHIP_TYPE_OPTIONS,
  type SponsorRequestTypeKey,
} from "@/features/sponsor-hub/constants";
import { uploadSponsorRequestLogo } from "@/features/sponsor-hub/uploadLogo";

const EMPTY_FORM = {
  business_name: "",
  contact_name: "",
  job_title: "",
  email: "",
  phone: "",
  website: "",
  industry: "",
  city: "",
  state: "",
  company_description: "",
  community_initiatives: "",
  sponsorship_types: [] as SponsorRequestTypeKey[],
  geographic_areas_served: "",
  annual_sponsorship_budget: "",
  preferred_opportunities: "",
  linkedin: "",
  additional_comments: "",
};

export default function StrategicSponsorHubRequest() {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const logoPreview = useMemo(() => (logoFile ? URL.createObjectURL(logoFile) : null), [logoFile]);

  const toggleType = (value: SponsorRequestTypeKey, checked: boolean) => {
    setForm((current) => ({
      ...current,
      sponsorship_types: checked
        ? [...current.sponsorship_types, value]
        : current.sponsorship_types.filter((item) => item !== value),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.business_name.trim() || !form.contact_name.trim() || !form.email.trim()) {
      toast({
        title: "Required fields missing",
        description: "Business name, contact name, and email are required.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      let logoUrl: string | null = null;
      if (logoFile) {
        logoUrl = await uploadSponsorRequestLogo(logoFile);
      }

      const { data, error } = await supabase.functions.invoke("sponsor-hub-request", {
        body: {
          business_name: form.business_name.trim(),
          contact_name: form.contact_name.trim(),
          job_title: form.job_title.trim() || null,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          website: form.website.trim() || null,
          industry: form.industry.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          company_description: form.company_description.trim() || null,
          community_initiatives: form.community_initiatives.trim() || null,
          sponsorship_types: form.sponsorship_types,
          geographic_areas_served: form.geographic_areas_served.trim() || null,
          annual_sponsorship_budget: form.annual_sponsorship_budget.trim() || null,
          preferred_opportunities: form.preferred_opportunities.trim() || null,
          linkedin: form.linkedin.trim() || null,
          logo_url: logoUrl,
          additional_comments: form.additional_comments.trim() || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Submission failed.");

      setSubmitted(true);
      setForm(EMPTY_FORM);
      setLogoFile(null);
    } catch (submitError) {
      toast({
        title: "Could not submit request",
        description: submitError instanceof Error ? submitError.message : "Please try again shortly.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EA]">
      <div className="border-b border-[#D8C28B]/40 bg-[#0A1A35] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C59B3C]">JahKnowsPR Firm</p>
            <h1 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">Strategic Sponsor Hub Request</h1>
          </div>
          <Handshake className="hidden h-10 w-10 text-[#C59B3C] sm:block" />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Button variant="ghost" asChild className="mb-6 px-0 text-primary hover:bg-transparent">
          <Link to="/the-brief/sponsorship-is-more-than-a-logo">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to sponsorship article
          </Link>
        </Button>

        {submitted ? (
          <Card className="border-[#D8C28B]/40 bg-white/90 shadow-lg">
            <CardContent className="space-y-4 p-8 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-[#C59B3C]" />
              <h2 className="font-serif text-3xl font-bold text-primary">Request received</h2>
              <p className="text-muted-foreground">
                Thank you for your interest in the JahKnowsPR Firm Strategic Sponsor Hub. Our team will review your
                submission and follow up if your organization aligns with upcoming sponsorship opportunities.
              </p>
              <p className="text-sm text-muted-foreground">{SPONSOR_REQUEST_DISCLAIMER}</p>
              <Button asChild className="mt-2">
                <Link to="/the-brief">Return to The Brief</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-[#D8C28B]/40 bg-white/90 shadow-lg">
            <CardContent className="space-y-6 p-6 sm:p-8">
              <div className="space-y-2">
                <p className="text-sm leading-6 text-muted-foreground">
                  Tell us about your organization if you would like to be considered for JahKnowsPR Firm client events,
                  nonprofit initiatives, and community partnerships.
                </p>
                <p className="rounded-xl border border-[#D8C28B]/30 bg-[#F7F3EA]/70 p-4 text-sm leading-6 text-[#0A1A35]/80">
                  {SPONSOR_REQUEST_DISCLAIMER}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="business_name">Business / Organization Name *</Label>
                    <Input
                      id="business_name"
                      value={form.business_name}
                      onChange={(event) => setForm((current) => ({ ...current, business_name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Contact Name *</Label>
                    <Input
                      id="contact_name"
                      value={form.contact_name}
                      onChange={(event) => setForm((current) => ({ ...current, contact_name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      value={form.job_title}
                      onChange={(event) => setForm((current) => ({ ...current, job_title: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      required
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
                      placeholder="https://"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input
                      id="industry"
                      value={form.industry}
                      onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={form.state}
                      onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_description">Brief Company Description</Label>
                  <Textarea
                    id="company_description"
                    rows={4}
                    value={form.company_description}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, company_description: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="community_initiatives">Community initiatives currently supported</Label>
                  <Textarea
                    id="community_initiatives"
                    rows={3}
                    value={form.community_initiatives}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, community_initiatives: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-3">
                  <Label>Types of sponsorships interested in</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {SPONSORSHIP_TYPE_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 rounded-lg border bg-[#F7F3EA]/40 px-3 py-2 text-sm"
                      >
                        <Checkbox
                          checked={form.sponsorship_types.includes(option.value)}
                          onCheckedChange={(checked) => toggleType(option.value, checked === true)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="geographic_areas_served">Geographic areas served</Label>
                    <Input
                      id="geographic_areas_served"
                      value={form.geographic_areas_served}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, geographic_areas_served: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="annual_sponsorship_budget">Annual sponsorship budget (optional)</Label>
                    <Input
                      id="annual_sponsorship_budget"
                      value={form.annual_sponsorship_budget}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, annual_sponsorship_budget: event.target.value }))
                      }
                      placeholder="$5,000 - $25,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedin">LinkedIn (optional)</Label>
                    <Input
                      id="linkedin"
                      value={form.linkedin}
                      onChange={(event) => setForm((current) => ({ ...current, linkedin: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferred_opportunities">Preferred sponsorship opportunities</Label>
                  <Textarea
                    id="preferred_opportunities"
                    rows={3}
                    value={form.preferred_opportunities}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, preferred_opportunities: event.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logo">Upload company logo (optional)</Label>
                  <div className="flex flex-col gap-3 rounded-xl border border-dashed bg-[#F7F3EA]/40 p-4 sm:flex-row sm:items-center">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg object-contain" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_comments">Additional comments</Label>
                  <Textarea
                    id="additional_comments"
                    rows={4}
                    value={form.additional_comments}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, additional_comments: event.target.value }))
                    }
                  />
                </div>

                <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting request...
                    </>
                  ) : (
                    "Submit Request"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
