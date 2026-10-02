import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema } from "@/lib/structured-data";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SESSION_CTA_PATH } from "@/content/firm";

type InquiryIntent = "project" | "counsel" | "general";

const intentCopy: Record<InquiryIntent, { title: string; description: string }> = {
  project: {
    title: "Discuss a Strategic Communications + PR Project",
    description: "Share the objective, timeline, and stakeholders. We will follow up to scope counsel and execution.",
  },
  counsel: {
    title: "Request Ongoing Strategic Communications Counsel",
    description: "Tell us about your role, organization, and the kind of judgment you need on a recurring basis.",
  },
  general: {
    title: "General inquiry",
    description: "Media, partnerships, speaking, or questions about JahKnowsPR.",
  },
};

function parseIntent(raw: string | null): InquiryIntent {
  if (raw === "project" || raw === "counsel") return raw;
  return "general";
}

export default function ContactPage() {
  const [params] = useSearchParams();
  const intent = useMemo(() => parseIntent(params.get("intent")), [params]);
  const copy = intentCopy[intent];

  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    business_name: "",
    message: "",
  });

  useEffect(() => {
    document.title = "Contact | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute("content", "Route your inquiry to the right JahKnowsPR engagement.");
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.email || !form.business_name) {
      toast.error("First name, email, and organization are required.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: customer, error } = await supabase
        .from("customers")
        .insert({
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone_number: form.phone_number || null,
          business_name: form.business_name,
          client_status: "lead_captured",
        })
        .select()
        .single();
      if (error) throw error;

      const title =
        intent === "project"
          ? "Project inquiry"
          : intent === "counsel"
            ? "Ongoing counsel inquiry"
            : "General inquiry";

      await supabase.from("meetings").insert({
        customer_id: customer.id,
        title,
        description: `[${intent}] ${form.message || "No additional message."}`,
        meeting_date: new Date().toISOString(),
        duration_minutes: 30,
        status: "pending",
        booking_kind: intent === "counsel" ? "campaign_retainer" : "full_program_sales",
      });

      toast.success("Thank you—we will be in touch.");
      setForm({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        business_name: "",
        message: "",
      });
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong. Please email welcome@jahknowspr.com.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <StructuredData
        id="contact"
        data={breadcrumbListSchema([
          { name: "Home", url: "/" },
          { name: "Contact", url: "/contact" },
        ])}
      />
      <section className="pt-28 pb-12 px-4 sm:px-6 border-b border-border">
        <div className="max-w-3xl mx-auto space-y-6">
          <SectionHeader eyebrow="Contact" title={copy.title} description={copy.description} />
          <p className="text-sm text-muted-foreground">
            Need clarity before a public moment?{" "}
            <Link to={SESSION_CTA_PATH} className="text-primary font-medium hover:underline">
              Book a Strategic Communications Session
            </Link>{" "}
            instead of this form.
          </p>
        </div>
      </section>
      <section className="py-16 px-4 sm:px-6">
        <form onSubmit={onSubmit} className="max-w-xl mx-auto space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="business">Organization *</Label>
            <Input
              id="business"
              value={form.business_name}
              onChange={(e) => setForm({ ...form, business_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">What do you need counsel on?</Label>
            <Textarea
              id="message"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Sending…" : "Submit inquiry"}
          </Button>
        </form>
      </section>
    </div>
  );
}
