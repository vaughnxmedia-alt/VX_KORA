import { Outlet, useLocation } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import { AuthProvider } from './components/AuthProvider';
import { Footer } from './components/Footer';
import { SubscriberPopup } from './components/SubscriberPopup';
import { useEffect, useRef } from 'react';
import { StructuredData } from '@/components/StructuredData';
import { organizationSchema, websiteSchema } from '@/lib/structured-data';
import { trackAIReferralVisit, trackPageView } from "@/lib/kora-analytics";
import { briefTrackingFields, trackBriefGaPageView } from "@/lib/brief-analytics";
import { scrollAppToTop } from "@/lib/scrollAppToTop";
import { cn } from "@/lib/utils";

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
  const isHq = location.pathname.startsWith('/hq');
  const isPortal = location.pathname.startsWith('/portal');
  const hideChrome = isDashboard || isHq || isPortal;
  const usesDocumentScroll =
    !isDashboard &&
    !isHq &&
    (isPortal ||
      location.pathname.startsWith("/strategy-session") ||
      location.pathname.startsWith("/free-audit"));
  const hideFooter =
    location.pathname.startsWith("/strategy-session") ||
    location.pathname.startsWith("/free-audit") ||
    isHq;
  const mainRef = useRef<HTMLDivElement>(null);
  const lastTrackedView = useRef<{ key: string; at: number }>({ key: "", at: 0 });

  useEffect(() => {
    scrollAppToTop();
  }, [location.pathname]);

  useEffect(() => {
    const pagePath = location.pathname;
    const viewKey = `${pagePath}${location.search}`;
    const viewedAt = Date.now();
    if (lastTrackedView.current.key === viewKey && viewedAt - lastTrackedView.current.at < 1500) return;
    lastTrackedView.current = { key: viewKey, at: viewedAt };
    const brief = briefTrackingFields(pagePath);
    const contentType = brief
      ? "the-brief"
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
      page_title: document.title,
      content_type: contentType,
      content_id: brief
        ? brief.content_id
        : pagePath.startsWith("/locations/") || pagePath.startsWith("/answers/")
          ? pagePath.split("/").filter(Boolean)[1]
          : undefined,
      blog_slug: brief?.blog_slug ?? undefined,
      metadata: {
        search: location.search || null,
        city_slug: pagePath.startsWith("/locations/") ? pagePath.split("/").filter(Boolean)[1] : null,
        answer_slug: pagePath.startsWith("/answers/") ? pagePath.split("/").filter(Boolean)[1] : null,
        article_slug: brief?.blog_slug ?? null,
        ai_referral_source: aiReferralSource,
      },
    });

    if (brief) {
      trackBriefGaPageView({
        pagePath,
        title: document.title,
        slug: brief.blog_slug,
      });
    }

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
      <div
        className={cn(
          "flex flex-col bg-background",
          usesDocumentScroll ? "min-h-screen" : "h-screen",
        )}
      >
        {!hideChrome && <StructuredData id="site-core" data={[organizationSchema(), websiteSchema()]} />}
        {!hideChrome && (
          <header className="flex-shrink-0">
            <Navigation />
          </header>
        )}
        <main
          ref={mainRef}
          data-app-scroll
          className={cn(
            "flex-grow",
            usesDocumentScroll ? "overflow-visible" : "h-full min-h-0 overflow-y-auto",
            isHq && "overflow-hidden",
          )}
        >
          <Outlet />
          {!hideChrome && !hideFooter && <Footer />}
        </main>
        {!hideChrome && <SubscriberPopup />}
      </div>
    </AuthProvider>
  );
}

export default App;
