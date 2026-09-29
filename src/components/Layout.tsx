import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, type ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { OfflineBanner, DisclaimerFooter } from './Banners';
import { BusIcon, StarIcon, InfoIcon, SearchIcon, PinIcon } from './Icons';
import { AlertBell } from './SmartAlerts';

function Tab({ to, label, icon, color }: { to: string; label: string; icon: ReactNode; color: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${isActive ? '' : 'text-slate-500'}`
      }
      style={({ isActive }) => (isActive ? { color } : undefined)}
    >
      {({ isActive }) => (
        <>
          <span
            className="grid h-7 w-12 place-items-center rounded-full transition-colors"
            style={isActive ? { background: `${color}1f` } : undefined}
          >
            {icon}
          </span>
          {label}
        </>
      )}
    </NavLink>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  // New page → start at the top (SPA navigation keeps the old scroll offset).
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <header className="mc-header safe-t sticky top-0 z-30 shadow-md">
        <div className="container-app flex items-center justify-between py-2.5">
          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="एसटी बस वेळापत्रक महा - मुखपृष्ठ">
            <div className="mc-logo flex h-9 w-9 shrink-0 items-center justify-center rounded-xl overflow-hidden">
              <img src="/icons/app-logo.png" alt="ST Bus Logo" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 leading-tight">
              <span className="block text-[14px] font-extrabold tracking-tight text-white">एसटी बस वेळापत्रक महा</span>
              <span className="mc-header-sub hidden truncate text-[11px] font-medium min-[400px]:block">ST Bus Timetable Maha</span>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <AlertBell />
            <LanguageSwitcher />
          </div>
        </div>
        <div className="rainbow-bar" aria-hidden />
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <DisclaimerFooter />

      {/* Bottom tab bar (mobile-first) */}
      <nav className="mc-nav safe-b fixed inset-x-0 bottom-0 z-30 backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          <Tab to="/" label="शोधा" color="#e11d48" icon={<SearchIcon width={20} height={20} />} />
          <Tab to="/districts" label="जिल्हे" color="#059669" icon={<PinIcon width={20} height={20} />} />
          <Tab to="/depots" label="आगार" color="#0284c7" icon={<BusIcon width={20} height={20} />} />
          <Tab to="/favorites" label="आवडते" color="#ca8a04" icon={<StarIcon width={20} height={20} />} />
          <Tab to="/settings" label="सेटिंग्ज" color="#7c3aed" icon={<InfoIcon width={20} height={20} />} />
        </div>
      </nav>

      {/* Decorative offset so home hero doesn't feel cramped under the header */}
      {isHome && <div aria-hidden className="sr-only" />}
    </div>
  );
}
