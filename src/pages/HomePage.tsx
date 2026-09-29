import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { StationInput } from '@/components/StationInput';
import { InstallButton } from '@/components/InstallButton';
import { SectionTitle } from '@/components/ui';
import { SwapIcon, SearchIcon, ArrowRightIcon, ChevronRightIcon, ClockIcon, StarFilledIcon } from '@/components/Icons';
import { BUS_PHOTOS, BusImage, PhotoCreditLine } from '@/components/BusPhoto';
import { SmartAlertStrip } from '@/components/SmartAlerts';
import { LockScreenCard } from '@/components/LockScreenCard';
import { NextDeparturesCard } from '@/components/NextDeparturesCard';
import { InlineAdBanner } from '@/components/AdBanner';
import { getRecent, clearRecent, type RecentSearch } from '@/services/db';
import { useFavorites } from '@/hooks/useFavorites';
import { toISODate } from '@/utils/format';
import { routePairSlug } from '@/utils/text';
import { buildStopIndex, searchStops } from '@/search/searchEngine';
import type { Stop } from '@/types/domain';

export function HomePage() {
  const { core, stopById, divisionById } = useData();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const today = toISODate(new Date());

  const [depotQuery, setDepotQuery] = useState('');
  const [depotSuggestions, setDepotSuggestions] = useState<Stop[]>([]);
  const [showDepotSuggestions, setShowDepotSuggestions] = useState(false);

  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [date, setDate] = useState<string>(today);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [activeTab, setActiveTab] = useState<'depot' | 'route'>('depot');

  const { favorites } = useFavorites();

  useEffect(() => { void getRecent().then(setRecent); }, []);

  const stopIndex = useMemo(
    () => core ? buildStopIndex(core.stops) : [],
    [core],
  );

  const handleDepotInput = (val: string) => {
    setDepotQuery(val);
    if (!val.trim()) { setDepotSuggestions([]); return; }
    const results = searchStops(stopIndex, val, 6);
    setDepotSuggestions(results.map(r => stopById.get(r.id)).filter((s): s is Stop => Boolean(s)));
    setShowDepotSuggestions(true);
  };

  const selectDepot = (stop: Stop) => {
    setDepotQuery(lang === 'mr' ? stop.nameMr : stop.name);
    setShowDepotSuggestions(false);
    const depotId = stop.depot ?? stop.id;
    navigate(`/depot/${depotId}`);
  };

  const submitDepot = (e: React.FormEvent) => {
    e.preventDefault();
    if (depotSuggestions.length > 0) {
      selectDepot(depotSuggestions[0]);
    }
  };

  const swap = () => { setFrom(to); setTo(from); };

  const submitRoute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!from || !to) return;
    navigate(`/search?from=${from}&to=${to}&date=${date}`);
  };

  const favRoutes = favorites.filter(f => f.kind === 'route');

  return (
    <div>
      <Seo
        title="ST Bus Timetable Maha | एसटी बस वेळापत्रक महा"
        description="Search Maharashtra MSRTC ST bus timings by depot, city or route. मुंबई, पुणे, नाशिक, कोल्हापूर आणि सर्व महाराष्ट्रातील एसटी बस वेळापत्रक."
        path="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'ST Bus Timetable Maha',
          applicationCategory: 'TravelApplication',
          operatingSystem: 'Web, Android',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
        }}
      />

      {/* ── Hero: real photo, light overlay ── */}
      <div className="container-app pt-4">
        <div className="relative overflow-hidden rounded-2xl">
          <img
            src="/icons/lalpari.png"
            alt="MSRTC Lalpari ordinary ST bus"
            className="h-40 w-full object-cover sm:h-52"
            loading="eager"
          />
          <div className="mc-hero-overlay absolute inset-0" />
          <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-200">महाराष्ट्र एसटी</p>
            <h1 className="text-2xl font-extrabold leading-tight text-white drop-shadow">एसटी बस वेळापत्रक</h1>
            <p className="text-sm font-medium text-white/90">
              {lang === 'mr' ? 'सर्व जिल्हे · सर्व तालुके' : 'Every district · every taluka'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="container-app mt-3">
        <div className="card mc-top p-4 pt-5 shadow-sm">
          <div className="mc-seg mb-4 grid grid-cols-2 rounded-xl p-1" role="tablist">
            {([
              ['route', lang === 'mr' ? 'कुठून → कुठे' : 'From → To'],
              ['depot', lang === 'mr' ? 'बस स्थानक' : 'Bus stand'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                role="tab"
                aria-selected={activeTab === k}
                onClick={() => setActiveTab(k)}
                className={`rounded-lg py-2.5 text-sm font-bold transition-colors ${
                  activeTab === k ? 'mc-seg-active' : 'text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'depot' ? (
            <form onSubmit={submitDepot} className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">
                {lang === 'mr' ? 'बस स्थानक / गाव / तालुका' : 'Bus stand, town or taluka'}
              </label>
              <div className="relative">
                <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={depotQuery}
                  onChange={e => handleDepotInput(e.target.value)}
                  onFocus={() => depotSuggestions.length > 0 && setShowDepotSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDepotSuggestions(false), 150)}
                  placeholder={lang === 'mr' ? 'उदा. पुणे, वाई, जुन्नर' : 'e.g. Pune, Wai, Junnar'}
                  className="field pl-10"
                  autoComplete="off"
                />
                {showDepotSuggestions && depotSuggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border bg-white shadow-lg" style={{ borderColor: 'var(--line)' }}>
                    {depotSuggestions.map(stop => (
                      <li key={stop.id}>
                        <button
                          type="button"
                          onMouseDown={() => selectDepot(stop)}
                          className="flex w-full flex-col px-4 py-2.5 text-left hover:bg-slate-50"
                        >
                          <span className="text-sm font-semibold text-slate-900">{lang === 'mr' ? stop.nameMr : stop.name}</span>
                          <span className="text-xs text-slate-500">
                            {lang === 'mr' ? stop.name : stop.nameMr}
                            {stop.district && stop.district !== 'Unknown' ? ` · ${stop.district}` : ''}
                            {stop.taluka ? ` · ${lang === 'mr' ? 'तालुका' : 'taluka'}` : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" className="btn-primary w-full" disabled={!depotQuery.trim()}>
                <SearchIcon width={18} height={18} />
                {lang === 'mr' ? 'वेळापत्रक पाहा' : 'Show timetable'}
              </button>
            </form>
          ) : (
            <form onSubmit={submitRoute} className="space-y-3">
              <div className="relative space-y-3">
                <StationInput label={t('search.from')} placeholder={t('search.placeholderFrom')} value={from} onChange={setFrom} />
                <button type="button" onClick={swap} aria-label={t('search.swap')}
                  className="absolute right-3 top-1/2 z-10 -mt-3 grid h-9 w-9 place-items-center rounded-full border bg-white text-slate-600 shadow-sm hover:text-slate-900"
                  style={{ borderColor: 'var(--line)' }}>
                  <SwapIcon width={16} height={16} />
                </button>
                <StationInput label={t('search.to')} placeholder={t('search.placeholderTo')} value={to} onChange={setTo} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">{t('search.date')}</label>
                <input type="date" className="field" value={date} min={today} onChange={e => setDate(e.target.value || today)} />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={!from || !to}>
                <SearchIcon width={18} height={18} />
                {t('search.button')}
              </button>
            </form>
          )}
        </div>
        <div className="mt-3 flex justify-center"><InstallButton /></div>
      </div>

      {/* Quick actions — one colour each */}
      <div className="container-app mt-4 grid grid-cols-4 gap-2">
        {[
          { to: '/districts', label: lang === 'mr' ? 'जिल्हे' : 'Districts', icon: '🗺️', tint: 'tint-green' },
          { to: '/depots', label: lang === 'mr' ? 'आगार' : 'Depots', icon: '🚏', tint: 'tint-sky' },
          { to: '/bus', label: lang === 'mr' ? 'बस प्रकार' : 'Bus types', icon: '🚌', tint: 'tint-violet' },
          { to: '/passes', label: lang === 'mr' ? 'पास व योजना' : 'Passes', icon: '🎫', tint: 'tint-amber' },
        ].map(a => (
          <Link key={a.to} to={a.to} className={`${a.tint} flex flex-col items-center gap-1 rounded-2xl py-3 text-center transition-transform active:scale-95`}>
            <span className="text-xl" aria-hidden>{a.icon}</span>
            <span className="text-xs font-bold">{a.label}</span>
          </Link>
        ))}
      </div>

      <SmartAlertStrip />
      <LockScreenCard compact />

      {/* Ad Banner after main actions */}
      <div className="container-app mt-4">
        <InlineAdBanner />
      </div>

      <div className="container-app mt-4">
        <NextDeparturesCard />
      </div>

      <div className="container-app pb-8">
        {recent.length > 0 && (
          <section>
            <SectionTitle action={
              <button className="text-xs font-medium text-slate-500 hover:text-slate-800" onClick={() => { void clearRecent().then(() => setRecent([])); }}>
                {t('recent.clear')}
              </button>
            }>{t('home.recent')}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {recent.map(r => (
                <Link key={r.id} to={`/search?from=${r.from}&to=${r.to}&date=${today}`} className="chip border bg-white text-slate-700 hover:border-slate-300" style={{ borderColor: 'var(--line)' }}>
                  <ClockIcon width={13} height={13} className="text-slate-400" />
                  {r.fromName}<ArrowRightIcon width={11} height={11} className="text-slate-400" />{r.toName}
                </Link>
              ))}
            </div>
          </section>
        )}

        {favRoutes.length > 0 && (
          <section>
            <SectionTitle>{t('home.favorites')}</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {favRoutes.map(f => (
                <Link key={f.id} to={`/route/${routePairSlug((f as any).from, (f as any).to)}`} className="chip border bg-white text-slate-700" style={{ borderColor: 'var(--line)' }}>
                  <StarFilledIcon width={12} height={12} className="text-amber-500" />
                  {(f as any).fromName}<ArrowRightIcon width={11} height={11} />{(f as any).toName}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Browse by district */}
        <section>
          <SectionTitle action={<Link to="/districts" className="link-accent">{lang === 'mr' ? 'सर्व तालुके →' : 'All talukas →'}</Link>}>
            {lang === 'mr' ? 'जिल्ह्यानुसार शोधा' : 'Browse by district'}
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {(core?.districts ?? []).map(d => (
              <Link key={d.id} to={`/district/${d.id}`} className={`chip rc-chip region-${divisionById.get(d.division)?.region ?? 'pune'} py-1.5 text-[13px] font-semibold`}>
                {lang === 'mr' ? d.nameMr : d.name}
              </Link>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {(['mumbai', 'pune', 'nashik', 'sambhajinagar', 'nagpur', 'amravati'] as const).map(r => (
              <span key={r} className={`region-${r} inline-flex items-center gap-1`}>
                <span className="rc-dot h-2 w-2 rounded-full" />
                {({ mumbai: ['मुंबई', 'Mumbai'], pune: ['पुणे', 'Pune'], nashik: ['नाशिक', 'Nashik'], sambhajinagar: ['छ. संभाजीनगर', 'Chh. Sambhajinagar'], nagpur: ['नागपूर', 'Nagpur'], amravati: ['अमरावती', 'Amravati'] } as const)[r][lang === 'mr' ? 0 : 1]}
                {lang === 'mr' ? ' प्रदेश' : ''}
              </span>
            ))}
          </div>
        </section>

        {/* Popular routes */}
        {(core?.popularRoutes ?? []).length > 0 && (
          <section>
            <SectionTitle>{t('home.popular')}</SectionTitle>
            <div className="mc-cycle grid gap-2">
              {(core?.popularRoutes ?? []).map(p => {
                const a = stopById.get(p.from);
                const b = stopById.get(p.to);
                if (!a || !b) return null;
                return (
                  <Link key={p.routeId} to={`/route/${routePairSlug(p.from, p.to)}`} className="tile justify-between">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                      {localName(lang, a)}
                      <ArrowRightIcon width={14} height={14} className="shrink-0 text-slate-400" />
                      {localName(lang, b)}
                    </span>
                    <ChevronRightIcon width={16} height={16} className="shrink-0 text-slate-300" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Ad Banner in middle of content */}
        <InlineAdBanner />

        {/* Bus types with real photos */}
        <section>
          <SectionTitle action={<Link to="/bus" className="link-accent">{lang === 'mr' ? 'सर्व पाहा →' : 'See all →'}</Link>}>
            {lang === 'mr' ? 'एसटी बसचे प्रकार' : 'ST bus types'}
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { id: 'ordinary', name: 'लालपरी', sub: 'Ordinary · साधी', img: '/icons/lalpari.png', c: '#dc2626' },
              { id: 'express', name: 'परिवर्तन', sub: 'Express · जलद', img: '/icons/Semi_laxary.png', c: '#ea580c' },
              { id: 'shivshahi', name: 'शिवशाही', sub: 'AC', img: '/icons/Shivshahi.png', c: '#7c3aed' },
              { id: 'shivneri', name: 'शिवनेरी', sub: 'Premium AC', img: '/icons/Shivneri.png', c: '#1d4ed8' },
              { id: 'ashwamedh', name: 'अश्वमेध', sub: 'AC Scania', img: '/icons/E-Shivneri.png', c: '#4338ca' },
              { id: 'shivai', name: 'ई-शिवाई', sub: 'Electric AC', img: '/icons/E-Shivai2.png', c: '#059669' },
            ].map(b => (
              <Link key={b.id} to={`/bus/${b.id}`} className="card-hover overflow-hidden" style={{ borderBottom: `4px solid ${b.c}` }}>
                <img src={b.img} alt={`${b.name} MSRTC bus`} className="h-28 w-full object-cover" loading="lazy" />
                <div className="px-3 py-2">
                  <p className="text-sm font-bold" style={{ color: b.c }}>{b.name}</p>
                  <p className="text-[11px] text-slate-500">{b.sub}</p>
                </div>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400">
            Official MSRTC bus images — credits in <Link to="/about" className="underline">About</Link>.
          </p>
        </section>

        {/* Coverage */}
        <section className="card mc-top mt-4 p-4 pt-5">
          <h2 className="text-base font-bold text-slate-900">{lang === 'mr' ? 'माहिती कुठून?' : 'Where the timings come from'}</h2>
          <p className="muted mt-1 text-sm leading-relaxed">
            {lang === 'mr'
              ? 'एसटी महामंडळाच्या अधिकृत संकेतस्थळावरील ३१ विभागांच्या वेळापत्रकांवरून (msrtc.maharashtra.gov.in) तयार. प्रवासापूर्वी बस स्थानकावर वेळ खात्री करा.'
              : 'Built from the 31 official division timetables published on msrtc.maharashtra.gov.in. Please confirm at the bus stand before travelling.'}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {[
              { v: core?.metadata.counts.trips ?? 0, l: lang === 'mr' ? 'बस वेळा' : 'departures', tint: 'tint-red' },
              { v: core?.metadata.counts.routes ?? 0, l: lang === 'mr' ? 'मार्ग' : 'routes', tint: 'tint-sky' },
              { v: core?.metadata.counts.stops ?? 0, l: lang === 'mr' ? 'गावे / स्थानके' : 'places', tint: 'tint-green' },
            ].map(s => (
              <div key={s.l} className={`${s.tint} rounded-xl py-2.5`}>
                <p className="text-lg font-bold tabular-nums">{s.v.toLocaleString('en-IN')}</p>
                <p className="text-[11px] font-medium opacity-80">{s.l}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
