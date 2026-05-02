import { Outlet, useLocation } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { AuthProvider } from './components/AuthProvider';
import { Footer } from './components/Footer';
import { SubscriberPopup } from './components/SubscriberPopup';
import { useEffect, useRef } from 'react';
import { StructuredData } from '@/components/StructuredData';
import { organizationSchema, websiteSchema } from '@/lib/structured-data';
import { trackAIReferralVisit, trackPageView } from "@/lib/kora-analytics";

function detectAIReferralSource(referrer: string): string | null {
  if (!referrer) return null;
  const normalized = referrer.toLowerCase();
  if (normalized.includes("chatgpt.com")) return "chatgpt";
  if (normalized.includes("perplexity.ai")) return "perplexity";
  if (normalized.includes("copilot.microsoft.com")) return "copilot";
  if (normalized.includes("bing.com")) return "bing";
  if (normalized.includes("gemini.google.com")) return "gemini";
  return null;
}

function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  useEffect(() => {
    const pagePath = location.pathname;
    const contentType =
      pagePath.startsWith("/the-brief")
        ? "blog"
        : pagePath.startsWith("/answers")
          ? "ai_answer"
        : pagePath.startsWith("/locations")
          ? "location_page"
        : pagePath.startsWith("/free-audit")
          ? "audit"
          : pagePath.startsWith("/strategy-session") || pagePath.startsWith("/brand-strategy-session")
            ? "strategy_session"
            : pagePath.startsWith("/brand-blueprint")
              ? "brand_blueprint"
              : pagePath.startsWith("/dashboard")
                ? "dashboard"
                : "page";

    const aiReferralSource = detectAIReferralSource(document.referrer || "");

    trackPageView({
      page_path: pagePath,
      content_type: contentType,
      content_id:
        pagePath.startsWith("/locations/") || pagePath.startsWith("/answers/")
          ? pagePath.split("/").filter(Boolean)[1]
          : undefined,
      metadata: {
        search: location.search || null,
        city_slug: pagePath.startsWith("/locations/") ? pagePath.split("/").filter(Boolean)[1] : null,
        answer_slug: pagePath.startsWith("/answers/") ? pagePath.split("/").filter(Boolean)[1] : null,
        ai_referral_source: aiReferralSource,
      },
    });

    if (aiReferralSource) {
      trackAIReferralVisit({
        page_path: pagePath,
        content_type: contentType,
        referrer: document.referrer,
        metadata: {
          ai_referral_source: aiReferralSource,
          search: location.search || null,
        },
      });
    }
  }, [location.pathname, location.search]);

  return (
    <AuthProvider>
      <div className="flex flex-col h-screen bg-background">
        {!isDashboard && <StructuredData id="site-core" data={[organizationSchema(), websiteSchema()]} />}
        {!isDashboard && (
          <header className="flex-shrink-0">
            <Navigation />
          </header>
        )}
        <main 
          ref={mainRef}
          className="flex-grow h-full min-h-0 overflow-y-auto"
        >
          <Outlet />
          {!isDashboard && <Footer />}
        </main>
        {!isDashboard && <SubscriberPopup />}
      </div>
    </AuthProvider>
  );
}

export default App;
