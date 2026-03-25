import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import Index from './pages/Index';
import Shop from './pages/Shop';
import WorkWithMe from './pages/WorkWithMe';
import About from './pages/About';
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
import TargetAudience from './pages/dashboard/TargetAudience';
import ContentCalendar from './pages/dashboard/ContentCalendar';
import FilmingSchedule from './pages/dashboard/FilmingSchedule';
import Meetings from './pages/dashboard/Meetings';
import StrategyUpdates from './pages/dashboard/StrategyUpdates';
import Analytics from './pages/dashboard/Analytics';
import Leads from './pages/dashboard/Leads';
import Clients from './pages/dashboard/Clients';
import EventsManagement from './pages/dashboard/EventsManagement';
import Subscribers from './pages/dashboard/Subscribers';
import StrategySessionCalendarSettings from './pages/dashboard/StrategySessionCalendarSettings';
import AssetLibrary from './pages/dashboard/AssetLibrary';
import Reports from './pages/dashboard/Reports';
import Settings from './pages/dashboard/Settings';
import ContentStrategy from './pages/dashboard/ContentStrategy';
import CampaignGenerator from './pages/dashboard/CampaignGenerator';
import IntelligenceFilters from './pages/dashboard/IntelligenceFilters';
import Sources from './pages/dashboard/Sources';
import { GetInspiredPage } from '@/features/inspired/GetInspiredPage';
import { InspiredProjectListPage } from '@/features/inspired/InspiredProjectListPage';
import { CampaignsLayout } from '@/features/campaigns/CampaignsLayout';
import { CampaignsIndexPage } from '@/features/campaigns/pages/CampaignsIndexPage';
import { CampaignDetailPage } from '@/features/campaigns/pages/CampaignDetailPage';
import Events from './pages/Events';
import Kora from './pages/Kora';
import StrategySessionBooking from './pages/StrategySessionBooking';
import StrategySessionPayment from './pages/StrategySessionPayment';
import StrategySessionThankYou from './pages/StrategySessionThankYou';
import CreativeProductionConsultation from './pages/consultations/CreativeProductionConsultation';
import CampaignRetainerConsultation from './pages/consultations/CampaignRetainerConsultation';
import KoraPlatformConsultation from './pages/consultations/KoraPlatformConsultation';

import './index.css';

const queryClient = new QueryClient();

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
              <Route path="/strategy-session" element={<StrategySessionBooking />} />
              <Route path="/strategy-session/payment" element={<StrategySessionPayment />} />
              <Route path="/strategy-session/thank-you" element={<StrategySessionThankYou />} />
              <Route path="/consultation/creative-production" element={<CreativeProductionConsultation />} />
              <Route path="/consultation/campaign-retainer" element={<CampaignRetainerConsultation />} />
              <Route path="/consultation/kora-platform" element={<KoraPlatformConsultation />} />
              <Route path="/about" element={<About />} />
              <Route path="/the-brief" element={<TheBriefRoute />} />
              <Route path="/the-brief/:id" element={<TheBriefPostRoute />} />
              <Route path="/events" element={<Events />} />
              <Route path="/kora" element={<Kora />} />
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
                  <Route path="blueprints" element={<BrandBlueprints />} />
                  <Route path="audience" element={<TargetAudience />} />
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
                  <Route path="strategy" element={<StrategyUpdates />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="leads" element={
                      <ProtectedRoute allowedRoles={['admin', 'author', 'intern', '3pv']}>
                        <Leads />
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
                  <Route path="content-strategy" element={<ContentStrategy />} />
                  <Route path="campaign-generator" element={<CampaignGenerator />} />
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
