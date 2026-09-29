import { Suspense, lazy, useEffect } from 'react';
import { startSmartAlerts } from '@/services/smartAlerts';
import { initializeAdMob, showInterstitialAd, showAppOpenAd } from '@/services/admob';
import { NativeShell } from '@/components/NativeShell';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { DemoBanner } from '@/components/Banners';
import { Spinner, EmptyState } from '@/components/ui';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { HomePage } from '@/pages/HomePage';
import { App as CapacitorApp } from '@capacitor/app';

// Route-level code splitting
const SearchResultsPage  = lazy(() => import('@/pages/SearchResultsPage').then(m => ({ default: m.SearchResultsPage })));
const RoutePage          = lazy(() => import('@/pages/RoutePage').then(m => ({ default: m.RoutePage })));
const RouteTimetablePage = lazy(() => import('@/pages/RouteTimetablePage').then(m => ({ default: m.RouteTimetablePage })));
const StationPage        = lazy(() => import('@/pages/StationPage').then(m => ({ default: m.StationPage })));
const DepotPage          = lazy(() => import('@/pages/DepotPage').then(m => ({ default: m.DepotPage })));
const DepotsListPage     = lazy(() => import('@/pages/DepotsListPage').then(m => ({ default: m.DepotsListPage })));
const ServicesIndexPage  = lazy(() => import('@/pages/ServicePages').then(m => ({ default: m.ServicesIndexPage })));
const ServicePage        = lazy(() => import('@/pages/ServicePages').then(m => ({ default: m.ServicePage })));
const FavoritesPage      = lazy(() => import('@/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const AboutPage          = lazy(() => import('@/pages/AboutPage').then(m => ({ default: m.AboutPage })));
const NearbyPage         = lazy(() => import('@/pages/NearbyPage').then(m => ({ default: m.NearbyPage })));
const SettingsPage       = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const ReportPage         = lazy(() => import('@/pages/ReportPage').then(m => ({ default: m.ReportPage })));
const DistrictsPage      = lazy(() => import('@/pages/DistrictsPage').then(m => ({ default: m.DistrictsPage })));
const DistrictPage       = lazy(() => import('@/pages/DistrictsPage').then(m => ({ default: m.DistrictPage })));
const AlertsPage         = lazy(() => import('@/pages/AlertsPage').then(m => ({ default: m.AlertsPage })));
const PassesPage         = lazy(() => import('@/pages/PassesPage').then(m => ({ default: m.PassesPage })));
const NotFoundPage       = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

function DataError() {
  const { status, reload } = useData();
  const { t } = useI18n();
  if (status !== 'error') return null;
  return (
    <div className="container-app mt-8">
      <EmptyState title={t('common.error')} hint="Could not load timetable data.">
        <button onClick={reload} className="btn-primary mt-2">{t('common.retry')}</button>
      </EmptyState>
    </div>
  );
}

export default function App() {
  const { status } = useData();
  const { lang } = useI18n();
  const location = useLocation();

  // Initialize AdMob on mount
  useEffect(() => {
    void initializeAdMob();

    // Show app open ad on first launch
    const timer = setTimeout(() => {
      void showAppOpenAd();
    }, 2000); // Show after 2 seconds to let app load

    return () => clearTimeout(timer);
  }, []);

  // Listen for app resume from background and show app open ad
  useEffect(() => {
    const handleAppStateChange = () => {
      void showAppOpenAd();
    };

    // Add listener for app resume
    const listener = CapacitorApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        handleAppStateChange();
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  // Initialize smart alerts
  useEffect(() => { 
    void startSmartAlerts(lang); 
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show interstitial ad on navigation (every 3 page views)
  useEffect(() => {
    void showInterstitialAd();
  }, [location.pathname]);

  return (
    <Layout>
      <NativeShell />
      <DemoBanner />
      {status === 'error' ? (
        <DataError />
      ) : (
        <Suspense fallback={<Spinner />}>
          <Routes>
            {/* Home */}
            <Route path="/"                    element={<HomePage />} />
            {/* Search */}
            <Route path="/search"              element={<SearchResultsPage />} />
            {/* Route timetables — new lalparibus-style */}
            <Route path="/route/:slug"         element={<RouteTimetablePage />} />
            {/* Legacy route page (existing) */}
            <Route path="/st-bus/:pair"        element={<RoutePage />} />
            {/* Station / Depot */}
            <Route path="/station/:id"         element={<StationPage />} />
            <Route path="/depot/:id"           element={<DepotPage />} />
            <Route path="/depots"              element={<DepotsListPage />} />
            {/* District → taluka browse */}
            <Route path="/districts"           element={<DistrictsPage />} />
            <Route path="/district/:id"        element={<DistrictPage />} />
            {/* Bus types */}
            <Route path="/bus"                 element={<ServicesIndexPage />} />
            <Route path="/bus/:id"             element={<ServicePage />} />
            {/* Favorites + About */}
            <Route path="/favorites"           element={<FavoritesPage />} />
            <Route path="/about"               element={<AboutPage />} />
            <Route path="/nearby"              element={<NearbyPage />} />
            <Route path="/settings"            element={<SettingsPage />} />
            <Route path="/report"              element={<ReportPage />} />
            {/* Passes, schemes & alerts */}
            <Route path="/passes"              element={<PassesPage />} />
            <Route path="/alerts"              element={<AlertsPage />} />
            {/* 404 */}
            <Route path="*"                    element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      )}
    </Layout>
  );
}
