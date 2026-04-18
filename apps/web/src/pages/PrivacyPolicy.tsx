import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const LAST_UPDATED = "April 18, 2026";
const CONTACT_EMAIL = "welcome@jahknowspr.com";
const SITE_ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://jahknowspr.com";

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "How JahKnowsPR and VaughnX Technology LLC collect, use, and protect your personal information.",
      );
    }
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", `${SITE_ORIGIN}/privacy`);
    }
  }, []);

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
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Legal</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Privacy Policy</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-foreground/90 leading-relaxed text-[15px] md:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Who we are</h2>
            <p>
              This website and related services are operated by{" "}
              <strong className="text-foreground">VaughnX Technology LLC</strong> (“VaughnX,” “we,” “us,” or “our”) on
              behalf of the <strong className="text-foreground">JahKnowsPR</strong> brand. When you use our site,
              portals, or services, this policy explains how we handle personal information.
            </p>
            <p>
              Questions about privacy:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Information we collect</h2>
            <p>Depending on how you interact with us, we may collect:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Contact and identity data:</strong> name, email address, phone
                number, company or project name, and similar details you submit through forms, consultations, or
                scheduling.
              </li>
              <li>
                <strong className="text-foreground">Account data:</strong> if you create or use a portal account
                (including the JahKnowsPR / KORA dashboard), we process credentials and profile information managed
                through our authentication provider.
              </li>
              <li>
                <strong className="text-foreground">Service and project content:</strong> materials you upload or share
                for strategy sessions, brand work, subscriptions, or support (for example intake answers, briefs, or
                creative references).
              </li>
              <li>
                <strong className="text-foreground">Transaction data:</strong> when you pay for services, our payment
                partners process card and billing details; we typically receive limited identifiers and payment status,
                not your full card number.
              </li>
              <li>
                <strong className="text-foreground">Technical and usage data:</strong> IP address, device and browser
                type, general location derived from IP, pages viewed, and timestamps—used for security, analytics, and
                improving the site.
              </li>
              <li>
                <strong className="text-foreground">Communications:</strong> content of emails or messages you send us,
                and records needed to respond or fulfill services.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. How we use information</h2>
            <p>We use personal information to:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Provide, schedule, and deliver services you request;</li>
              <li>Operate and secure our websites, portals, and internal tools;</li>
              <li>Process payments and prevent fraud;</li>
              <li>Communicate with you about projects, confirmations, and support;</li>
              <li>Comply with law and enforce our agreements;</li>
              <li>Improve our offerings and user experience, including aggregated or de-identified analytics where
                appropriate.</li>
            </ul>
            <p className="text-muted-foreground">
              We do not sell your personal information as that term is commonly understood in U.S. state privacy laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Legal bases (where applicable)</h2>
            <p className="text-muted-foreground">
              If you are in the European Economic Area, the United Kingdom, or similar jurisdictions, we rely on bases
              such as: performance of a contract, legitimate interests (for example network security and product
              improvement, balanced against your rights), consent where required, and legal obligation.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Sharing and processors</h2>
            <p>
              We share information with service providers who assist our operations under contractual safeguards,
              including:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Hosting and data:</strong> cloud infrastructure and database
                providers (for example Supabase) for storage, authentication, and application logic.
              </li>
              <li>
                <strong className="text-foreground">Payments:</strong> payment processors such as Square to complete
                transactions you authorize.
              </li>
              <li>
                <strong className="text-foreground">Communications:</strong> email delivery, notifications, or
                customer-support tooling.
              </li>
              <li>
                <strong className="text-foreground">Analytics and security:</strong> vendors that help us detect abuse
                and understand aggregate usage.
              </li>
            </ul>
            <p className="text-muted-foreground">
              We may disclose information if required by law, legal process, or to protect the rights, safety, and
              security of our users, the public, or our business.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Retention</h2>
            <p className="text-muted-foreground">
              We keep information only as long as needed for the purposes above, including legal, accounting, and
              dispute-resolution requirements. Retention periods vary by data type; project and client records may be
              kept longer where necessary to deliver ongoing services or meet professional obligations.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Security</h2>
            <p className="text-muted-foreground">
              We use administrative, technical, and organizational measures designed to protect personal information.
              No method of transmission or storage is completely secure; we encourage strong passwords and caution when
              sharing sensitive materials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Your choices and rights</h2>
            <p className="text-muted-foreground">
              Depending on where you live, you may have rights to access, correct, delete, or export certain personal
              information, or to object to or restrict certain processing. You may also have the right to lodge a
              complaint with a supervisory authority. To exercise rights, contact us at the email above. We will respond
              consistent with applicable law.
            </p>
            <p className="text-muted-foreground">
              For how to request deletion of personal data we hold—including what we delete, what we may retain, and
              expected timelines—see our{" "}
              <Link to="/data-deletion" className="text-primary underline-offset-4 hover:underline">
                Data deletion policy
              </Link>
              .
            </p>
            <p className="text-muted-foreground">
              <strong className="text-foreground">California residents:</strong> California law may grant you
              additional rights (for example, to know categories of information collected, to request deletion subject
              to exceptions, and to opt out of “sale” or “sharing” as defined under the CCPA/CPRA). We do not
              knowingly sell personal information of minors under 16.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Cookies and similar technologies</h2>
            <p className="text-muted-foreground">
              We and our partners may use cookies, local storage, and similar technologies for essential site operation,
              preferences, analytics, and security. You can control cookies through your browser settings; blocking
              some cookies may affect functionality (for example staying signed in).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. International transfers</h2>
            <p className="text-muted-foreground">
              We are based in the United States. If you access our services from other countries, your information may
              be processed in the U.S. and other locations where our providers operate. Where required, we use
              appropriate safeguards for cross-border transfers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">11. Children</h2>
            <p className="text-muted-foreground">
              Our services are not directed to children under 13 (or the minimum age in your jurisdiction). We do not
              knowingly collect personal information from children. If you believe we have collected information from a
              child, please contact us and we will take appropriate steps.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">12. Third-party sites</h2>
            <p className="text-muted-foreground">
              Our site may link to third-party websites or social platforms. Their privacy practices are governed by
              their own policies; we are not responsible for those sites.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">13. Changes to this policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will post the revised version on this page and
              update the “Last updated” date. Material changes may be communicated through the site or by email where
              appropriate.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <Link to="/data-deletion" className="text-primary underline-offset-4 hover:underline">
                Data deletion policy
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
