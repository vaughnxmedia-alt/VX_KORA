import { useEffect, useState } from "react";
import { StructuredData } from "@/components/StructuredData";
import { breadcrumbListSchema } from "@/lib/structured-data";
import { SectionHeader } from "@/components/public/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function RequestPresence() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    organization: "",
    event_name: "",
    event_date: "",
    city: "",
    message: "",
  });

  useEffect(() => {
    document.title = "Request Presence | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute(
      "content",
      "Request Jocelyn Vaughn for a speaking engagement.",
    );
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name || !form.email || !form.organization || !form.message) {
      toast.error("Name, email, organization, and a note about the engagement are required.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("request-presence", {
        body: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          organization: form.organization.trim(),
          event_name: form.event_name.trim(),
          event_date: form.event_date,
          city: form.city.trim(),
          message: form.message.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "Submission failed.");
      setSent(true);
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
        id="request-presence"
        data={breadcrumbListSchema([
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
          { name: "Request Presence", url: "/request-presence" },
        ])}
      />
      <section className="pt-28 pb-12 px-4 sm:px-6 border-b border-border bg-cream/25">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Speaking"
            title="Request Presence"
            description="Invite Jocelyn Vaughn to speak. Share the event, the room, and what you need her to address."
          />
        </div>
      </section>
      <section className="py-16 px-4 sm:px-6">
        {sent ? (
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="font-serif text-2xl font-bold">Request received.</h2>
            <p className="text-muted-foreground leading-relaxed">
              Thank you. We’ll review the engagement and be in touch.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="max-w-xl mx-auto space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name *</Label>
                <Input
                  id="first_name"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name</Label>
                <Input
                  id="last_name"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  autoComplete="family-name"
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
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization *</Label>
              <Input
                id="organization"
                value={form.organization}
                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                autoComplete="organization"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event_name">Event</Label>
              <Input
                id="event_name"
                value={form.event_name}
                onChange={(e) => setForm({ ...form, event_name: e.target.value })}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event_date">Event date</Label>
                <Input
                  id="event_date"
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">About the engagement *</Label>
              <Textarea
                id="message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Audience, topic, and what you need from the talk."
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Submit request"}
            </Button>
          </form>
        )}
      </section>
    </div>
  );
}
