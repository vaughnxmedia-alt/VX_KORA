import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import ProtectedRoute from './components/ProtectedRoute';

import './index.css';

const queryClient = new QueryClient();
const KORA_PUBLIC_URL = String(import.meta.env.VITE_KORA_PUBLIC_URL || "/").replace(/\/$/, "") || "/";

const Index = React.lazy(() => import('./pages/Index'));
const Shop = React.lazy(() => import('./pages/Shop'));
const WorkWithMe = React.lazy(() => import('./pages/WorkWithMe'));
const WorkWithUs = React.lazy(() => import('./pages/WorkWithUs'));
const OurWork = React.lazy(() => import('./pages/OurWork'));
const InsightsHub = React.lazy(() => import('./pages/InsightsHub'));
const InsightsSpamReport = React.lazy(() => import('./pages/InsightsSpamReport'));
const InsightsPRCourt = React.lazy(() => import('./pages/InsightsPRCourt'));
const ContactPage = React.lazy(() => import('./pages/ContactPage'));
const About = React.lazy(() => import('./pages/AboutPublic'));
const RequestPresence = React.lazy(() => import('./pages/RequestPresence'));
const PrivacyPolicy = React.lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = React.lazy(() => import('./pages/TermsOfService'));
const DataDeletionPolicy = React.lazy(() => import('./pages/DataDeletionPolicy'));
const BrandBlueprint = React.lazy(() => import('./pages/BrandBlueprint'));
const Payment = React.lazy(() => import('./pages/Payment'));
const Auth = React.lazy(() => import('./pages/Auth'));
const EmailConfirmation = React.lazy(() => import('./pages/EmailConfirmation'));
const SignupConfirmation = React.lazy(() => import('./pages/SignupConfirmation'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const TheBriefRoute = React.lazy(() => import('./components/TheBriefRoute'));
const TheBriefPostRoute = React.lazy(() => import('./components/TheBriefPostRoute'));
const BeforeYouBuildBrandGuide = React.lazy(() => import('./pages/blog/BeforeYouBuildBrandGuide'));
const PerfectStartupLandingPage = React.lazy(() =>
  import('./pages/ThePerfectStartup').then((module) => ({ default: module.PerfectStartupLandingPage })),
);
const PerfectStartupStatePage = React.lazy(() =>
  import('./pages/ThePerfectStartup').then((module) => ({ default: module.PerfectStartupStatePage })),
);
const DashboardLayout = React.lazy(() => import('./components/dashboard/DashboardLayout'));
const Events = React.lazy(() => import('./pages/Events'));
const BrandStrategySessionLanding = React.lazy(() => import('./pages/BrandStrategySessionLanding'));
const FreeAudit = React.lazy(() => import('./pages/FreeAudit'));
const FreeAuditThankYou = React.lazy(() => import('./pages/FreeAuditThankYou'));
const FreeAuditStarterGuideThankYou = React.lazy(() => import('./pages/FreeAuditStarterGuideThankYou'));
const BrandFoundationStarterGuide = React.lazy(() => import('./pages/BrandFoundationStarterGuide'));
const Links = React.lazy(() => import('./pages/Links'));
const AuditAudioPage = React.lazy(() => import('./pages/AuditAudioPage'));
const StrategySessionBooking = React.lazy(() => import('./pages/StrategySessionBooking'));
const StrategySessionPayment = React.lazy(() => import('./pages/StrategySessionPayment'));
const StrategySessionThankYou = React.lazy(() => import('./pages/StrategySessionThankYou'));
const CreativeProductionConsultation = React.lazy(() => import('./pages/consultations/CreativeProductionConsultation'));
const CampaignRetainerConsultation = React.lazy(() => import('./pages/consultations/CampaignRetainerConsultation'));
const LocationsIndexPage = React.lazy(() =>
  import('./pages/Locations').then((module) => ({ default: module.LocationsIndexPage })),
);
const CityLandingPage = React.lazy(() =>
  import('./pages/Locations').then((module) => ({ default: module.CityLandingPage })),
);
const AnswersHub = React.lazy(() =>
  import('./pages/Answers').then((module) => ({ default: module.AnswersHub })),
);
const AnswerPageDetail = React.lazy(() =>
  import('./pages/Answers').then((module) => ({ default: module.AnswerPageDetail })),
);

// Dashboard pages are intentionally split away from the public site bundle.
const Overview = React.lazy(() => import('./pages/dashboard/Overview'));
const BlogManagement = React.lazy(() => import('./pages/dashboard/BlogManagement'));
const BrandBlueprints = React.lazy(() => import('./pages/dashboard/BrandBlueprints'));
const IntakePipelinePage = React.lazy(() => import('./pages/dashboard/IntakePipelinePage'));
const AudienceIntelligenceIndex = React.lazy(() => import('./pages/dashboard/audience/AudienceIntelligenceIndex'));
const AudienceIntelligenceDetail = React.lazy(() => import('./pages/dashboard/audience/AudienceIntelligenceDetail'));
const AudienceIntelligenceCreate = React.lazy(() => import('./pages/dashboard/audience/AudienceIntelligenceCreate'));
const ContentCalendar = React.lazy(() => import('./pages/dashboard/ContentCalendar'));
const FilmingSchedule = React.lazy(() => import('./pages/dashboard/FilmingSchedule'));
const Meetings = React.lazy(() => import('./pages/dashboard/Meetings'));
const Analytics = React.lazy(() => import('./pages/dashboard/Analytics'));
const Leads = React.lazy(() => import('./pages/dashboard/Leads'));
const Audits = React.lazy(() => import('./pages/dashboard/Audits'));
const AuditTemplates = React.lazy(() => import('./pages/dashboard/AuditTemplates'));
const Clients = React.lazy(() => import('./pages/dashboard/Clients'));
const EventsManagement = React.lazy(() => import('./pages/dashboard/EventsManagement'));
const Subscribers = React.lazy(() => import('./pages/dashboard/Subscribers'));
const StrategySessionCalendarSettings = React.lazy(() => import('./pages/dashboard/StrategySessionCalendarSettings'));
const AssetLibrary = React.lazy(() => import('./pages/dashboard/AssetLibrary'));
const Reports = React.lazy(() => import('./pages/dashboard/Reports'));
const Settings = React.lazy(() => import('./pages/dashboard/Settings'));
const CreativeHubPage = React.lazy(() =>
  import('@/features/creative-hub/CreativeHubPage').then((module) => ({ default: module.CreativeHubPage })),
);
const LogisticsPage = React.lazy(() => import('./pages/dashboard/LogisticsPage'));
const IntelligenceFilters = React.lazy(() => import('./pages/dashboard/IntelligenceFilters'));
const Sources = React.lazy(() => import('./pages/dashboard/Sources'));
const SponsorshipDatabase = React.lazy(() => import('./pages/dashboard/SponsorshipDatabase'));
const SponsorRequests = React.lazy(() => import('./pages/dashboard/SponsorRequests'));
const StrategicSponsorHubRequest = React.lazy(() => import('./pages/StrategicSponsorHubRequest'));
const GetInspiredPage = React.lazy(() =>
  import('@/features/inspired/GetInspiredPage').then((module) => ({ default: module.GetInspiredPage })),
);
const InspiredProjectListPage = React.lazy(() =>
  import('@/features/inspired/InspiredProjectListPage').then((module) => ({ default: module.InspiredProjectListPage })),
);
const CampaignsLayout = React.lazy(() =>
  import('@/features/campaigns/CampaignsLayout').then((module) => ({ default: module.CampaignsLayout })),
);
const CampaignsIndexPage = React.lazy(() =>
  import('@/features/campaigns/pages/CampaignsIndexPage').then((module) => ({ default: module.CampaignsIndexPage })),
);
const CampaignDetailPage = React.lazy(() =>
  import('@/features/campaigns/pages/CampaignDetailPage').then((module) => ({ default: module.CampaignDetailPage })),
);
const HqApp = React.lazy(() => import('@/features/hq/HqApp'));
const HqDashboardPage = React.lazy(() => import('@/features/hq/pages/HqDashboardPage'));
const HqCrmListPage = React.lazy(() =>
  import('@/features/hq/pages/HqCrmPages').then((m) => ({ default: m.HqCrmListPage })),
);
const HqCrmEditorPage = React.lazy(() =>
  import('@/features/hq/pages/HqCrmPages').then((m) => ({ default: m.HqCrmEditorPage })),
);
const HqClientsListPage = React.lazy(() =>
  import('@/features/hq/pages/HqClientsPages').then((m) => ({ default: m.HqClientsListPage })),
);
const HqClientDetailPage = React.lazy(() =>
  import('@/features/hq/pages/HqClientsPages').then((m) => ({ default: m.HqClientDetailPage })),
);
const HqTasksPage = React.lazy(() => import('@/features/hq/pages/HqTasksPage'));
const HqJourneysPage = React.lazy(() => import('@/features/hq/pages/HqJourneysPage'));
const HqEngagementPage = React.lazy(() => import('@/features/hq/pages/HqEngagementPage'));
const HqJourneyTemplatesPage = React.lazy(() => import('@/features/hq/pages/HqJourneyTemplatesPage'));
const HqContentListPage = React.lazy(() =>
  import('@/features/hq/pages/HqContentPages').then((m) => ({ default: m.HqContentListPage })),
);
const HqCaseStudiesPage = React.lazy(() => import('@/features/hq/pages/HqCaseStudiesPage'));
const HqContentEditorPage = React.lazy(() =>
  import('@/features/hq/pages/HqContentPages').then((m) => ({ default: m.HqContentEditorPage })),
);
const HqTeamPage = React.lazy(() =>
  import('@/features/hq/pages/HqOpsPages').then((m) => ({ default: m.HqTeamPage })),
);
const HqSettingsPage = React.lazy(() =>
  import('@/features/hq/pages/HqOpsPages').then((m) => ({ default: m.HqSettingsPage })),
);
const CiModuleGate = React.lazy(() =>
  import('@/features/communications-intelligence/CiModuleGate').then((m) => ({ default: m.CiModuleGate })),
);
const CiOrganizationsListPage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationsListPage').then((m) => ({
    default: m.CiOrganizationsListPage,
  })),
);
const CiOrganizationWorkspacePage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationWorkspacePage').then((m) => ({
    default: m.CiOrganizationWorkspacePage,
  })),
);
const CiOrganizationGuidePage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationGuidePage').then((m) => ({
    default: m.CiOrganizationGuidePage,
  })),
);
const CiOrganizationOverviewTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationOverviewTab').then((m) => ({
    default: m.CiOrganizationOverviewTab,
  })),
);
const CiOrganizationPreviewPage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationPreviewPage').then((m) => ({
    default: m.CiOrganizationPreviewPage,
  })),
);
const CiOrganizationNotesTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationNotesTab').then((m) => ({
    default: m.CiOrganizationNotesTab,
  })),
);
const CiOrganizationIntelligenceTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationIntelligenceTab').then((m) => ({
    default: m.CiOrganizationIntelligenceTab,
  })),
);
const CiOrganizationHealthTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationHealthTab').then((m) => ({
    default: m.CiOrganizationHealthTab,
  })),
);
const CiOrganizationPrioritiesTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationPrioritiesTab').then((m) => ({
    default: m.CiOrganizationPrioritiesTab,
  })),
);
const CiAssessmentsDashboardPage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiAssessmentsDashboardPage').then((m) => ({
    default: m.CiAssessmentsDashboardPage,
  })),
);
const CiOrganizationMessagingTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationMessagingTab').then((m) => ({
    default: m.CiOrganizationMessagingTab,
  })),
);
const CiPortalApp = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalApp').then((m) => ({
    default: m.CiPortalApp,
  })),
);
const CiPortalDashboardPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalDashboardPage').then((m) => ({
    default: m.CiPortalDashboardPage,
  })),
);
const CiPortalHealthPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalHealthPage').then((m) => ({
    default: m.CiPortalHealthPage,
  })),
);
const CiPortalPrioritiesPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalPrioritiesPage').then((m) => ({
    default: m.CiPortalPrioritiesPage,
  })),
);
const CiPortalMessagingPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalMessagingPage').then((m) => ({
    default: m.CiPortalMessagingPage,
  })),
);
const CiOrganizationOpportunitiesTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationOpportunitiesTab').then((m) => ({
    default: m.CiOrganizationOpportunitiesTab,
  })),
);
const CiOrganizationActionsTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationActionsTab').then((m) => ({
    default: m.CiOrganizationActionsTab,
  })),
);
const CiPortalOpportunitiesPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalOpportunitiesPage').then((m) => ({
    default: m.CiPortalOpportunitiesPage,
  })),
);
const CiPortalActionsPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalActionsPage').then((m) => ({
    default: m.CiPortalActionsPage,
  })),
);
const CiPortalCounselPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalCounselPage').then((m) => ({
    default: m.CiPortalCounselPage,
  })),
);
const CiPortalCounselNewPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalCounselNewPage').then((m) => ({
    default: m.CiPortalCounselNewPage,
  })),
);
const CiPortalCounselDetailPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalCounselDetailPage').then((m) => ({
    default: m.CiPortalCounselDetailPage,
  })),
);
const CiOpsDashboardPage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOpsDashboardPage').then((m) => ({
    default: m.CiOpsDashboardPage,
  })),
);
const CiPortalOnboardingPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalOnboardingPage').then((m) => ({
    default: m.CiPortalOnboardingPage,
  })),
);
const CiPortalInvitePage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalInvitePage').then((m) => ({
    default: m.CiPortalInvitePage,
  })),
);
const CiCounselInboxPage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiCounselInboxPage').then((m) => ({
    default: m.CiCounselInboxPage,
  })),
);
const CiCounselRequestDetailPage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiCounselRequestDetailPage').then((m) => ({
    default: m.CiCounselRequestDetailPage,
  })),
);
const CiOrganizationCounselTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationCounselTab').then((m) => ({
    default: m.CiOrganizationCounselTab,
  })),
);
const CiOrganizationOutcomesTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationOutcomesTab').then((m) => ({
    default: m.CiOrganizationOutcomesTab,
  })),
);
const CiOrganizationReportsTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationReportsTab').then((m) => ({
    default: m.CiOrganizationReportsTab,
  })),
);
const CiOrganizationPilotTab = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiOrganizationPilotTab').then((m) => ({
    default: m.CiOrganizationPilotTab,
  })),
);
const CiPilotDashboardPage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiPilotDashboardPage').then((m) => ({
    default: m.CiPilotDashboardPage,
  })),
);
const CiPilotLearningPage = React.lazy(() =>
  import('@/features/communications-intelligence/pages/CiPilotLearningPage').then((m) => ({
    default: m.CiPilotLearningPage,
  })),
);
const CiPortalPlanPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalPlanPage').then((m) => ({
    default: m.CiPortalPlanPage,
  })),
);
const CiPortalProgressPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalProgressPage').then((m) => ({
    default: m.CiPortalProgressPage,
  })),
);
const CiPortalReportsPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalReportsPage').then((m) => ({
    default: m.CiPortalReportsPage,
  })),
);
const CiPortalReportDetailPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalReportDetailPage').then((m) => ({
    default: m.CiPortalReportDetailPage,
  })),
);
const CiPortalFeedbackPage = React.lazy(() =>
  import('@/features/communications-intelligence/portal/CiPortalFeedbackPage').then((m) => ({
    default: m.CiPortalFeedbackPage,
  })),
);

const PageFallback = () => (
  <main className="min-h-screen grid place-items-center px-4 text-center text-sm text-muted-foreground">
    Loading...
  </main>
);

const LegacyBlogPostRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/the-brief/${encodeURIComponent(id)}` : "/the-brief"} replace />;
};

const KoraExternalRedirect = ({ path = "" }: { path?: string }) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const targetUrl = KORA_PUBLIC_URL === "/" ? "/" : `${KORA_PUBLIC_URL}${normalizedPath === "/" ? "" : normalizedPath}`;

  React.useEffect(() => {
    window.location.replace(targetUrl);
  }, [targetUrl]);

  return (
    <main className="min-h-screen grid place-items-center px-4 text-center">
      <a className="text-primary underline underline-offset-4" href={targetUrl}>
        Continue to KORA
      </a>
    </main>
  );
};

const KoraWildcardRedirect = () => {
  const { "*": path } = useParams();
  return <KoraExternalRedirect path={path || ""} />;
};

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <React.Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<App />}>
                <Route index element={<Index />} />
                <Route path="/home" element={<Index />} />
                <Route path="/shop" element={<Shop />} />
                <Route path="/work-with-us" element={<WorkWithUs />} />
                <Route path="/work-with-me" element={<Navigate to="/work-with-us" replace />} />
                <Route path="/work" element={<OurWork />} />
                <Route path="/insights" element={<InsightsHub />} />
                <Route path="/insights/the-brief" element={<TheBriefRoute />} />
                <Route path="/insights/spam-report" element={<InsightsSpamReport />} />
                <Route path="/insights/pr-court" element={<InsightsPRCourt />} />
                <Route path="/contact" element={<ContactPage />} />
                {/* Legacy services page — preserved, not in primary nav */}
                <Route path="/services" element={<WorkWithMe />} />
                <Route path="/brand-strategy-session" element={<BrandStrategySessionLanding />} />
                <Route path="/free-audit" element={<FreeAudit />} />
                <Route path="/free-audit/thank-you" element={<FreeAuditThankYou />} />
                <Route path="/free-audit/starter-guide-thank-you" element={<FreeAuditStarterGuideThankYou />} />
                <Route path="/brand-foundation" element={<BrandFoundationStarterGuide />} />
                <Route path="/links" element={<Links />} />
                <Route path="/audit/:businessSlug" element={<AuditAudioPage />} />
                <Route path="/strategy-session" element={<StrategySessionBooking />} />
                <Route path="/strategy-session/payment" element={<StrategySessionPayment />} />
                <Route path="/strategy-session/thank-you" element={<StrategySessionThankYou />} />
                <Route path="/consultation/creative-production" element={<CreativeProductionConsultation />} />
                <Route path="/consultation/campaign-retainer" element={<CampaignRetainerConsultation />} />
                <Route path="/consultation/kora-platform" element={<KoraExternalRedirect path="/platform-consultation" />} />
                <Route path="/about" element={<About />} />
                <Route path="/request-presence" element={<RequestPresence />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/data-deletion" element={<DataDeletionPolicy />} />
                <Route path="/blog" element={<Navigate to="/the-brief" replace />} />
                <Route path="/blog/:id" element={<LegacyBlogPostRedirect />} />
                <Route path="/the-brief" element={<TheBriefRoute />} />
                <Route path="/the-brief/the-perfect-startup" element={<PerfectStartupLandingPage />} />
                <Route path="/the-brief/the-perfect-startup/:stateSlug" element={<PerfectStartupStatePage />} />
                <Route path="/the-brief/before-you-build-the-brand-starter-guide" element={<BeforeYouBuildBrandGuide />} />
                <Route path="/the-brief/before-you-build-the-brand/:guideSlug" element={<BeforeYouBuildBrandGuide />} />
                <Route path="/the-brief/:id" element={<TheBriefPostRoute />} />
                <Route path="/locations" element={<LocationsIndexPage />} />
                <Route path="/locations/:citySlug" element={<CityLandingPage />} />
                <Route path="/answers" element={<AnswersHub />} />
                <Route path="/answers/:answerSlug" element={<AnswerPageDetail />} />
                <Route path="/events" element={<Events />} />
                <Route path="/kora" element={<KoraExternalRedirect />} />
                <Route path="/kora/*" element={<KoraWildcardRedirect />} />
                <Route path="/brand-blueprint" element={<BrandBlueprint />} />
                <Route path="/strategic-sponsor-hub/request" element={<StrategicSponsorHubRequest />} />
                <Route path="/payment" element={<Payment />} />

                {/* === JAHKNOWSPR HQ (private operations) === */}
                <Route path="/hq" element={<HqApp />}>
                  <Route index element={<HqDashboardPage />} />
                  <Route path="crm" element={<HqCrmListPage />} />
                  <Route path="crm/:id" element={<HqCrmEditorPage />} />
                  <Route path="clients" element={<HqClientsListPage />} />
                  <Route path="clients/:id" element={<HqClientDetailPage />} />
                  <Route path="tasks" element={<HqTasksPage />} />
                  <Route path="journeys" element={<HqJourneysPage />} />
                  <Route path="journeys/templates" element={<HqJourneyTemplatesPage />} />
                  <Route path="settings/services" element={<HqJourneyTemplatesPage />} />
                  <Route path="journeys/:engagementId" element={<HqEngagementPage />} />
                  <Route path="content" element={<HqContentListPage />} />
                  <Route path="case-studies" element={<HqCaseStudiesPage />} />
                  <Route path="content/:id" element={<HqContentEditorPage />} />
                  <Route path="team" element={<HqTeamPage />} />
                  <Route path="settings" element={<HqSettingsPage />} />
                  <Route path="intelligence" element={<CiModuleGate />}>
                    <Route index element={<CiOpsDashboardPage />} />
                    <Route path="assessments" element={<CiAssessmentsDashboardPage />} />
                    <Route path="organizations" element={<CiOrganizationsListPage />} />
                    <Route path="organizations/:orgId" element={<CiOrganizationWorkspacePage />}>
                      <Route index element={<CiOrganizationGuidePage />} />
                      <Route path="overview" element={<CiOrganizationOverviewTab />} />
                      <Route path="intelligence" element={<CiOrganizationIntelligenceTab />} />
                      <Route path="priorities" element={<CiOrganizationPrioritiesTab />} />
                      <Route path="health" element={<CiOrganizationHealthTab />} />
                      <Route path="messaging" element={<CiOrganizationMessagingTab />} />
                      <Route path="opportunities" element={<CiOrganizationOpportunitiesTab />} />
                      <Route path="actions" element={<CiOrganizationActionsTab />} />
                      <Route path="preview" element={<CiOrganizationPreviewPage />} />
                      <Route path="counsel" element={<CiOrganizationCounselTab />} />
                      <Route path="counsel/:requestId" element={<CiCounselRequestDetailPage />} />
                      <Route path="outcomes" element={<CiOrganizationOutcomesTab />} />
                      <Route path="reports" element={<CiOrganizationReportsTab />} />
                      <Route path="pilot" element={<CiOrganizationPilotTab />} />
                      <Route path="notes" element={<CiOrganizationNotesTab />} />
                    </Route>
                    <Route path="counsel" element={<CiCounselInboxPage />} />
                    <Route path="counsel/:requestId" element={<CiCounselRequestDetailPage />} />
                    <Route path="pilot" element={<CiPilotDashboardPage />} />
                    <Route path="learning" element={<CiPilotLearningPage />} />
                  </Route>
                </Route>

                <Route path="/join/:token" element={<CiPortalInvitePage />} />
                <Route path="/portal" element={<CiPortalApp />}>
                  <Route index element={<CiPortalDashboardPage />} />
                  <Route path="plan" element={<CiPortalPlanPage />} />
                  <Route path="onboarding" element={<CiPortalOnboardingPage />} />
                  <Route path="opportunities" element={<CiPortalOpportunitiesPage />} />
                  <Route path="actions" element={<CiPortalActionsPage />} />
                  <Route path="priorities" element={<CiPortalPrioritiesPage />} />
                  <Route path="health" element={<Navigate to="/portal/priorities" replace />} />
                  <Route path="messaging" element={<CiPortalMessagingPage />} />
                  <Route path="counsel" element={<CiPortalCounselPage />} />
                  <Route path="counsel/new" element={<CiPortalCounselNewPage />} />
                  <Route path="counsel/:requestId" element={<CiPortalCounselDetailPage />} />
                  <Route path="progress" element={<CiPortalProgressPage />} />
                  <Route path="reports" element={<CiPortalReportsPage />} />
                  <Route path="reports/:reportId" element={<CiPortalReportDetailPage />} />
                  <Route path="feedback" element={<CiPortalFeedbackPage />} />
                </Route>
                
                {/* === DASHBOARD ROUTES === */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                    <Route index element={<Overview />} />
                    <Route path="overview" element={<Overview />} />
                    <Route path="blog" element={
                        <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                          <BlogManagement />
                        </ProtectedRoute>
                    } />
                    <Route path="intake" element={
                        <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                          <IntakePipelinePage />
                        </ProtectedRoute>
                    } />
                    <Route path="identities" element={<BrandBlueprints />} />
                    <Route path="blueprints" element={<Navigate to="/dashboard/identities" replace />} />
                    <Route path="strategy" element={<Navigate to="/dashboard/identities" replace />} />
                    <Route path="audience" element={<AudienceIntelligenceIndex />} />
                    <Route path="audience/new" element={<AudienceIntelligenceCreate />} />
                    <Route path="audience/:audienceId" element={<AudienceIntelligenceDetail />} />
                    <Route path="calendar" element={<ContentCalendar />} />
                    <Route path="campaigns" element={<CampaignsLayout />}>
                      <Route index element={<CampaignsIndexPage />} />
                      <Route path="new" element={<CampaignsIndexPage />} />
                      <Route path=":campaignId" element={<CampaignDetailPage />} />
                    </Route>
                    <Route path="get-inspired" element={<InspiredProjectListPage />} />
                    <Route path="get-inspired/board/:boardId" element={<GetInspiredPage />} />
                    <Route path="inspired" element={<InspiredProjectListPage />} />
                    <Route path="filming" element={<FilmingSchedule />} />
                    <Route path="meetings" element={<Meetings />} />
                    <Route path="strategy-session-calendar" element={
                        <ProtectedRoute allowedRoles={['admin']} requireBlueprint={false}>
                          <StrategySessionCalendarSettings />
                        </ProtectedRoute>
                    } />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="leads" element={
                        <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                          <Leads />
                        </ProtectedRoute>
                    } />
                    <Route path="audits" element={
                        <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                          <Audits />
                        </ProtectedRoute>
                    } />
                    <Route path="audits/templates" element={
                        <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                          <AuditTemplates />
                        </ProtectedRoute>
                    } />
                    <Route path="clients" element={
                        <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                          <Clients />
                        </ProtectedRoute>
                    } />
                    <Route path="events" element={
                        <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                          <EventsManagement />
                        </ProtectedRoute>
                    } />
                    <Route path="subscribers" element={
                        <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                          <Subscribers />
                        </ProtectedRoute>
                    } />
                    <Route path="assets" element={
                        <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                          <AssetLibrary />
                        </ProtectedRoute>
                    } />
                    <Route path="reports" element={<Reports />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="intelligence-filters" element={<IntelligenceFilters />} />
                    <Route path="content-strategy" element={<Navigate to="/dashboard/creative-hub" replace />} />
                    <Route path="creative-hub" element={<CreativeHubPage />} />
                    <Route path="logistics" element={<LogisticsPage />} />
                    <Route path="campaign-generator" element={<Navigate to="/dashboard/creative-hub" replace />} />
                    <Route path="sources" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <Sources />
                        </ProtectedRoute>
                    } />
                    <Route path="sponsor-hub" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <SponsorshipDatabase />
                        </ProtectedRoute>
                    } />
                    <Route path="sponsor-requests" element={
                        <ProtectedRoute allowedRoles={['admin']}>
                          <SponsorRequests />
                        </ProtectedRoute>
                    } />
                </Route>
                
                <Route path="/auth" element={<Auth />} />
                <Route path="/email-confirmation" element={<EmailConfirmation />} />
                <Route path="/signup-confirmation" element={<SignupConfirmation />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </React.Suspense>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
