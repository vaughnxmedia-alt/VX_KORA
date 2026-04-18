import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const LAST_UPDATED = "April 18, 2026";
const CONTACT_EMAIL = "welcome@jahknowspr.com";
const DELETION_SUBJECT = "Data deletion request";
const SITE_ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://jahknowspr.com";

export default function DataDeletionPolicy() {
  useEffect(() => {
    document.title = "Data Deletion Policy | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "How to request deletion of your personal data from JahKnowsPR and VaughnX Technology LLC services.",
      );
    }
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", `${SITE_ORIGIN}/data-deletion`);
    }
  }, []);

  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(DELETION_SUBJECT)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/home" className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-12 md:py-16 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Legal</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Data deletion policy</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-foreground/90 leading-relaxed text-[15px] md:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Purpose</h2>
            <p className="text-muted-foreground">
              This policy describes how you can request deletion of personal information associated with{" "}
              <strong className="text-foreground">JahKnowsPR</strong> websites, portals, and related services operated by{" "}
              <strong className="text-foreground">VaughnX Technology LLC</strong> (“we,” “us,” or “our”). It works
              together with our{" "}
              <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Who can request deletion</h2>
            <p className="text-muted-foreground">
              You may submit a request if you are the person the data identifies, a parent or guardian of a minor whose
              data we hold, or an authorized agent legally permitted to act on someone’s behalf (where applicable law
              allows). We may require proof of identity or authorization before processing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. How to submit a request</h2>
            <p className="text-muted-foreground">Send an email to:</p>
            <p>
              <a href={mailtoHref} className="text-primary font-medium underline-offset-4 hover:underline break-all">
                {CONTACT_EMAIL}
              </a>
            </p>
            <p className="text-muted-foreground">Use the subject line “{DELETION_SUBJECT}” and include, where possible:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>The full name and email address associated with your account or inquiry;</li>
              <li>Whether you used the public site, JKPR portal, KORA client area, or another program;</li>
              <li>A short description of what you want deleted (for example “entire account,” “strategy session booking,”
                “newsletter only”);</li>
              <li>Any reference IDs, dates, or business names that help us locate your records.</li>
            </ul>
            <p className="text-muted-foreground">
              If you prefer, you may also initiate a request through our support channels; we may still ask you to
              confirm details by email for security.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Verification</h2>
            <p className="text-muted-foreground">
              To protect you and others from fraudulent requests, we verify the requester before deleting or
              anonymizing data. That may include replying from the email on file, confirming account access, or asking
              for a reasonable additional identifier. If we cannot verify your request, we will explain why and what
              would be needed to continue.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. What we typically delete or anonymize</h2>
            <p className="text-muted-foreground">
              After a verified request, subject to the exceptions in Section 6, we aim to delete or irreversibly
              anonymize personal information in systems we control, which may include categories such as:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Portal or dashboard profile and preferences tied to your user account;</li>
              <li>Customer or lead records where we are not legally required to retain identifying data;</li>
              <li>Intake, consultation, or booking forms and related notes that identify you;</li>
              <li>Marketing or newsletter subscriptions associated with your email address.</li>
            </ul>
            <p className="text-muted-foreground">
              Some backups and logs may retain fragments for a limited period until they roll off according to our
              retention schedules; we do not use that residual data for active processing after your deletion is
              completed.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. What we may retain</h2>
            <p className="text-muted-foreground">
              We may decline or limit deletion where the law requires or permits retention, including:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Financial and tax records:</strong> invoices, payment confirmations,
                and accounting entries (often in aggregated or minimized form);
              </li>
              <li>
                <strong className="text-foreground">Legal and compliance:</strong> records needed to establish, exercise,
                or defend legal claims, or to meet regulatory obligations;
              </li>
              <li>
                <strong className="text-foreground">Fraud prevention and security:</strong> minimal records necessary to
                detect abuse or protect the integrity of our services;
              </li>
              <li>
                <strong className="text-foreground">Anonymized or aggregate data</strong> that does not identify you.
              </li>
            </ul>
            <p className="text-muted-foreground">
              Payment card numbers are processed by our payment partners (for example Square); we do not store full
              card numbers on our servers. Deletion of payment-related identifiers we hold may still leave records with
              the processor as their policies and law require.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Timeline</h2>
            <p className="text-muted-foreground">
              We acknowledge receipt of valid requests within a reasonable period and aim to complete verified deletion
              or anonymization within <strong className="text-foreground">thirty (30) to forty-five (45) days</strong>,
              unless a longer period is permitted by law or the request is unusually complex—in which case we will
              notify you of the extension and reason.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Authorized agents</h2>
            <p className="text-muted-foreground">
              If an agent submits a request on your behalf, we may require written permission signed by you and may
              verify your identity directly. We may deny requests from agents who do not provide proof of
              authorization as required by applicable law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. No discrimination</h2>
            <p className="text-muted-foreground">
              We will not deny services, charge different prices, or provide a different level of quality solely because
              you exercised a deletion or privacy right, except where permitted by law (for example, where the
              information is strictly necessary to perform the contract you asked us to keep).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Changes</h2>
            <p className="text-muted-foreground">
              We may update this Data Deletion Policy from time to time. The “Last updated” date at the top will change
              when we do; substantive changes may also be summarized in our Privacy Policy or by email where
              appropriate.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Related:{" "}
              <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              {" · "}
              <Link to="/terms" className="text-primary underline-offset-4 hover:underline">
                Terms of Service
              </Link>
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
