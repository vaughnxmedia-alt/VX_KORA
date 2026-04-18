import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const LAST_UPDATED = "April 18, 2026";
const CONTACT_EMAIL = "welcome@jahknowspr.com";
const SITE_ORIGIN = typeof window !== "undefined" ? window.location.origin : "https://jahknowspr.com";

export default function TermsOfService() {
  useEffect(() => {
    document.title = "Terms of Service | JahKnowsPR";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Terms governing use of the JahKnowsPR website and services operated by VaughnX Technology LLC.",
      );
    }
    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute("href", `${SITE_ORIGIN}/terms`);
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
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Legal</p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Terms of Service</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="space-y-10 text-foreground/90 leading-relaxed text-[15px] md:text-base">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Agreement</h2>
            <p className="text-muted-foreground">
              These Terms of Service (“Terms”) govern your access to and use of websites, portals, and related services
              offered by <strong className="text-foreground">VaughnX Technology LLC</strong> for the{" "}
              <strong className="text-foreground">JahKnowsPR</strong> brand (collectively, the “Services”). By using
              the Services, you agree to these Terms and our{" "}
              <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, do not use the Services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Eligibility and accounts</h2>
            <p className="text-muted-foreground">
              You represent that you have the legal capacity to enter these Terms. You are responsible for maintaining
              the confidentiality of your account credentials and for activity under your account. Notify us
              promptly at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              if you suspect unauthorized access.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Services and changes</h2>
            <p className="text-muted-foreground">
              We may modify, suspend, or discontinue features of the Services at any time. Separate agreements,
              statements of work, or checkout terms may apply to paid engagements and will control for those
              engagements where they conflict with these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Violate applicable law or infringe others’ rights;</li>
              <li>Attempt to gain unauthorized access to our systems, other users’ data, or third-party networks;</li>
              <li>Transmit malware, spam, or deceptive content;</li>
              <li>Scrape, harvest, or automate access to the Services in a way that burdens or circumvents our controls;</li>
              <li>Use the Services to build a competing product using our proprietary materials without permission.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Intellectual property</h2>
            <p className="text-muted-foreground">
              The Services, branding, and original content are owned by VaughnX Technology LLC and its licensors. We
              grant you a limited, non-exclusive, non-transferable license to use the Services for their intended
              purpose. You retain rights in materials you submit; you grant us a license to use those materials as
              needed to provide the Services you request.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Disclaimers</h2>
            <p className="text-muted-foreground uppercase text-xs tracking-wide">
              Important — please read carefully
            </p>
            <p className="text-muted-foreground">
              THE SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR
              IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT, TO THE
              FULLEST EXTENT PERMITTED BY LAW.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Limitation of liability</h2>
            <p className="text-muted-foreground">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, VAUGHNX TECHNOLOGY LLC AND ITS AFFILIATES, OFFICERS, AND EMPLOYEES
              WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS
              OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICES. OUR AGGREGATE LIABILITY FOR CLAIMS
              RELATING TO THE SERVICES IS LIMITED TO THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICES IN THE
              TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (US $100), EXCEPT WHERE PROHIBITED BY
              LAW.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Indemnity</h2>
            <p className="text-muted-foreground">
              You will defend and indemnify VaughnX Technology LLC and its personnel against claims arising from your
              misuse of the Services, your content, or your violation of these Terms or applicable law, subject to our
              right to control the defense of matters implicating our broader liability.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Governing law and disputes</h2>
            <p className="text-muted-foreground">
              These Terms are governed by the laws of the State of Texas, USA, excluding conflict-of-law rules. You
              agree to the exclusive jurisdiction and venue of the state and federal courts located in Texas for
              disputes arising from these Terms or the Services, except where prohibited by law.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. General</h2>
            <p className="text-muted-foreground">
              These Terms constitute the entire agreement between you and us regarding the subject matter here. If any
              provision is unenforceable, the remainder remains in effect. Failure to enforce a provision is not a
              waiver.
            </p>
          </section>

          <section className="space-y-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <Link to="/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              {" · "}
              <Link to="/data-deletion" className="text-primary underline-offset-4 hover:underline">
                Data deletion policy
              </Link>
            </p>
          </section>
        </div>
      </article>
    </div>
  );
}
