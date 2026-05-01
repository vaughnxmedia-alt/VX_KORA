import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import Index from './pages/Index';
import Shop from './pages/Shop';
import WorkWithMe from './pages/WorkWithMe';
import About from './pages/About';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import DataDeletionPolicy from './pages/DataDeletionPolicy';
import BlogPost from './pages/blog/BlogPost';
import BrandBlueprint from './pages/BrandBlueprint';
import Payment from './pages/Payment';
import Auth from './pages/Auth';
import EmailConfirmation from './pages/EmailConfirmation';
import SignupConfirmation from './pages/SignupConfirmation';
import NotFound from './pages/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import TheBriefRoute from './components/TheBriefRoute';
import TheBriefPostRoute from './components/TheBriefPostRoute';
import DashboardLayout from './components/dashboard/DashboardLayout';

// Dashboard Pages
import Overview from './pages/dashboard/Overview';
import BlogManagement from './pages/dashboard/BlogManagement';
import BrandBlueprints from './pages/dashboard/BrandBlueprints';
import IntakePipelinePage from './pages/dashboard/IntakePipelinePage';
import AudienceIntelligenceIndex from './pages/dashboard/audience/AudienceIntelligenceIndex';
import AudienceIntelligenceDetail from './pages/dashboard/audience/AudienceIntelligenceDetail';
import AudienceIntelligenceCreate from './pages/dashboard/audience/AudienceIntelligenceCreate';
import ContentCalendar from './pages/dashboard/ContentCalendar';
import FilmingSchedule from './pages/dashboard/FilmingSchedule';
import Meetings from './pages/dashboard/Meetings';
import Analytics from './pages/dashboard/Analytics';
import Leads from './pages/dashboard/Leads';
import Audits from './pages/dashboard/Audits';
import AuditTemplates from './pages/dashboard/AuditTemplates';
import Clients from './pages/dashboard/Clients';
import EventsManagement from './pages/dashboard/EventsManagement';
import Subscribers from './pages/dashboard/Subscribers';
import StrategySessionCalendarSettings from './pages/dashboard/StrategySessionCalendarSettings';
import AssetLibrary from './pages/dashboard/AssetLibrary';
import Reports from './pages/dashboard/Reports';
import Settings from './pages/dashboard/Settings';
import { CreativeHubPage } from '@/features/creative-hub/CreativeHubPage';
import LogisticsPage from './pages/dashboard/LogisticsPage';
import IntelligenceFilters from './pages/dashboard/IntelligenceFilters';
import Sources from './pages/dashboard/Sources';
import { GetInspiredPage } from '@/features/inspired/GetInspiredPage';
import { InspiredProjectListPage } from '@/features/inspired/InspiredProjectListPage';
import { CampaignsLayout } from '@/features/campaigns/CampaignsLayout';
import { CampaignsIndexPage } from '@/features/campaigns/pages/CampaignsIndexPage';
import { CampaignDetailPage } from '@/features/campaigns/pages/CampaignDetailPage';
import Events from './pages/Events';
import BrandStrategySessionLanding from './pages/BrandStrategySessionLanding';
import FreeAudit from './pages/FreeAudit';
import FreeAuditThankYou from './pages/FreeAuditThankYou';
import StrategySessionBooking from './pages/StrategySessionBooking';
import StrategySessionPayment from './pages/StrategySessionPayment';
import StrategySessionThankYou from './pages/StrategySessionThankYou';
import CreativeProductionConsultation from './pages/consultations/CreativeProductionConsultation';
import CampaignRetainerConsultation from './pages/consultations/CampaignRetainerConsultation';

import './index.css';

const queryClient = new QueryClient();
const KORA_PUBLIC_URL = String(import.meta.env.VITE_KORA_PUBLIC_URL || "/").replace(/\/$/, "") || "/";

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
          <Routes>
            <Route path="/" element={<App />}>
              <Route index element={<Index />} />
              <Route path="/home" element={<Index />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/work-with-me" element={<WorkWithMe />} />
              <Route path="/brand-strategy-session" element={<BrandStrategySessionLanding />} />
              <Route path="/free-audit" element={<FreeAudit />} />
              <Route path="/free-audit/thank-you" element={<FreeAuditThankYou />} />
              <Route path="/strategy-session" element={<StrategySessionBooking />} />
              <Route path="/strategy-session/payment" element={<StrategySessionPayment />} />
              <Route path="/strategy-session/thank-you" element={<StrategySessionThankYou />} />
              <Route path="/consultation/creative-production" element={<CreativeProductionConsultation />} />
              <Route path="/consultation/campaign-retainer" element={<CampaignRetainerConsultation />} />
              <Route path="/consultation/kora-platform" element={<KoraExternalRedirect path="/platform-consultation" />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/data-deletion" element={<DataDeletionPolicy />} />
              <Route path="/blog" element={<Navigate to="/the-brief" replace />} />
              <Route path="/blog/:id" element={<LegacyBlogPostRedirect />} />
              <Route path="/the-brief" element={<TheBriefRoute />} />
              <Route path="/the-brief/:id" element={<TheBriefPostRoute />} />
              <Route path="/events" element={<Events />} />
              <Route path="/kora" element={<KoraExternalRedirect />} />
              <Route path="/kora/*" element={<KoraWildcardRedirect />} />
              <Route path="/brand-blueprint" element={<BrandBlueprint />} />
              <Route path="/payment" element={<Payment />} />
              
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
              </Route>
              
              <Route path="/auth" element={<Auth />} />
              <Route path="/email-confirmation" element={<EmailConfirmation />} />
              <Route path="/signup-confirmation" element={<SignupConfirmation />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
