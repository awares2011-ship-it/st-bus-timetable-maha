import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Trip } from '@/types/domain';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { Spinner, EmptyState, SectionTitle } from '@/components/ui';
import { FavoriteButton } from '@/components/FavoriteButton';
import { BackButton } from '@/components/BackButton';
import { AdBanner, InlineAdBanner } from '@/components/AdBanner';
import { ArrowRightIcon, ChevronRightIcon, ClockIcon, SearchIcon } from '@/components/Icons';
import { useFavorites } from '@/hooks/useFavorites';
import { loadSchedule } from '@/services/data';
import { formatTime12 } from '@/utils/format';
import { routePairSlug } from '@/utils/text';

interface DepotRoute {
  routeId: string;
  toStop: { id: string; name: string; nameMr: string };
  via?: string;
  departures: string[];
}

export function DepotPage() {
  const { id = '' } = useParams();
  const { core, stopById, depotById, divisionById, routeById, status } = useData();
  const { t, lang } = useI18n();
  const { has, toggleStation } = useFavorites();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Find the station/stop for this depot
  const depot = depotById.get(id);
  const station = useMemo(
    () => core?.stops.find(s => s.depot === id || s.id === id),
    [core?.stops, id],
  );
  const division = station ? divisionById.get(station.division) : undefined;

  useEffect(() => {
    if (!division?.slug) { setTripsLoading(false); return; }
    setTripsLoading(true);
    loadSchedule(division.slug)
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
  }, [division?.slug]);

  // Build depot-wise departure table: group by destination
  const depotRoutes = useMemo((): DepotRoute[] => {
    if (!core || !station) return [];

    // Get routes from this depot's station
    const routesFrom = core.routes.filter(r => r.from === station.id);

    return routesFrom.map((route): DepotRoute | null => {
      const toStop = stopById.get(route.to);
      if (!toStop) return null;

      // Via = intermediate stops (exclude from and to)
      const viaStops = route.stops
        .slice(1, -1)
        .map(sid => stopById.get(sid))
        .filter(Boolean)
        .map(s => s!.name)
        .join(', ');

      // Get departure times for this route from loaded trips
      const routeTrips = trips
        .filter(tp => tp.routeId === route.id)
        .map(tp => tp.departure)
        .sort();

      return {
        routeId: route.id,
        toStop: { id: toStop.id, name: toStop.name, nameMr: toStop.nameMr ?? toStop.name },
        via: viaStops || undefined,
        departures: routeTrips,
      };
    }).filter((r): r is DepotRoute => r !== null);
  }, [core, station, trips, stopById]);

  const filtered = useMemo(() => {
    if (!search.trim()) return depotRoutes;
    const q = search.toLowerCase();
    return depotRoutes.filter(r =>
      r.toStop.name.toLowerCase().includes(q) ||
      r.toStop.nameMr.includes(q) ||
      (r.via && r.via.toLowerCase().includes(q)),
    );
  }, [depotRoutes, search]);

  if (status === 'loading') return <Spinner label={t('common.loading')} />;

  const displayName = depot
    ? (lang === 'mr' ? depot.nameMr : depot.name)
    : station
      ? localName(lang, station)
      : id;
  const stationName = station ? localName(lang, station) : id;
  const favId = station?.id ?? id;

  return (
    <div className="container-app">
      <Seo
        title={`${displayName} Bus Stand Timetable — MSRTC ST Buses`}
        description={`Complete bus timetable from ${displayName} bus stand. All destinations, departure times and via routes from ${displayName}.`}
        path={`/depot/${id}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BusStation',
          name: displayName,
          address: { '@type': 'PostalAddress', addressRegion: 'Maharashtra', addressCountry: 'IN' },
        }}
      />

      {/* Header */}
      <header className="mt-4 card p-5 text-slate-900">
        <BackButton className="mb-3" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>🚌</span>
              <span>बस स्थानक वेळापत्रक</span>
            </div>
            <h1 className="text-2xl font-extrabold leading-tight">{displayName}</h1>
            {lang === 'en' && station?.nameMr && (
              <p className="mt-0.5 text-slate-500 text-sm">{station.nameMr}</p>
            )}
            {division && (
              <span className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-0.5 text-xs font-medium">
                {localName(lang, division)} विभाग
              </span>
            )}
          </div>
          {station && (
            <FavoriteButton
              active={has(favId)}
              label={has(favId) ? t('common.remove') : t('common.save')}
              onToggle={() => toggleStation({ id: favId, stationId: favId, name: stationName })}
            />
          )}
        </div>

        {/* Quick stats */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#f4f3ef] p-3 text-center">
            <p className="text-xl font-bold">{depotRoutes.length}</p>
            <p className="text-xs text-slate-500">गंतव्य मार्ग</p>
          </div>
          <div className="rounded-xl bg-[#f4f3ef] p-3 text-center">
            <p className="text-xl font-bold">{trips.filter(tp => depotRoutes.some(dr => dr.routeId === tp.routeId)).length}</p>
            <p className="text-xs text-slate-500">एकूण बस</p>
          </div>
        </div>
        {station?.lat && station?.lng && (
          <a href={`https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-semibold text-st-700">🗺️ नकाशावर पहा — नेव्हिगेशन</a>
        )}
      </header>

      {/* Search within depot */}
      <div className="mt-4 relative">
        <SearchIcon width={16} height={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="गंतव्य शोधा... (e.g. Mumbai, Shirdi, नाशिक)"
          className="field pl-10 text-sm"
        />
      </div>

      {/* Timetable */}
      <SectionTitle>
        {search ? `"${search}" साठी निकाल` : 'सर्व गंतव्य बसेस'}
      </SectionTitle>

      {/* Ad before timetable */}
      <InlineAdBanner />

      {tripsLoading ? (
        <Spinner label="वेळापत्रक लोड होत आहे..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">🚌</span>}
          title={search ? 'कोणताही मार्ग सापडला नाही' : 'वेळापत्रक उपलब्ध नाही'}
          hint={search ? 'वेगळे नाव वापरून पाहा.' : 'या स्थानकासाठी डेटा जोडला जात आहे.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
            <span>गंतव्य / मार्ग</span>
            <span className="text-right">सुटण्याच्या वेळा</span>
          </div>

          {filtered.map((dr, i) => (
            <div
              key={dr.routeId}
              className={`px-4 py-3.5 ${i < filtered.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {/* Destination */}
                  <Link
                    to={station ? `/st-bus/${routePairSlug(station.id, dr.toStop.id)}` : '#'}
                    className="group flex items-center gap-1.5"
                  >
                    <span className="font-semibold text-slate-900 group-hover:text-st-700 transition-colors">
                      {lang === 'mr' ? dr.toStop.nameMr : dr.toStop.name}
                    </span>
                    {lang !== 'mr' && dr.toStop.nameMr !== dr.toStop.name && (
                      <span className="text-xs text-slate-400">{dr.toStop.nameMr}</span>
                    )}
                    <ChevronRightIcon width={14} height={14} className="text-slate-300 group-hover:text-st-500 transition-colors" />
                  </Link>

                  {/* Via route */}
                  {dr.via && (
                    <p className="mt-0.5 text-xs text-slate-400 truncate">
                      मार्गे: {dr.via}
                    </p>
                  )}
                </div>

                {/* Departure times */}
                <div className="flex-shrink-0 max-w-[55%] text-right">
                  {dr.departures.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-1">
                      {dr.departures.slice(0, 8).map(t => (
                        <span key={t} className="inline-block rounded-lg bg-st-50 px-2 py-0.5 text-xs font-mono font-semibold text-st-700 ring-1 ring-st-100">
                          {t}
                        </span>
                      ))}
                      {dr.departures.length > 8 && (
                        <Link
                          to={station ? `/st-bus/${routePairSlug(station.id, dr.toStop.id)}` : '#'}
                          className="inline-block rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 hover:text-st-700"
                        >
                          +{dr.departures.length - 8}
                        </Link>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">वेळ लवकरच</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdBanner slot="depot-bottom" />
      {/* Link to all routes from this station */}
      {station && (
        <div className="mt-6 mb-2">
          <Link
            to={`/station/${station.id}`}
            className="btn-ghost w-full justify-center text-sm"
          >
            स्थानक माहिती पाहा
            <ArrowRightIcon width={14} height={14} />
          </Link>
        </div>
      )}

      {/* Travel tips */}
      <section className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        <p className="font-semibold mb-1">📌 प्रवास टिप्स</p>
        <ul className="space-y-1 text-xs leading-relaxed">
          <li>• प्रवासापूर्वी अधिकृत MSRTC काउंटरवर वेळ तपासा.</li>
          <li>• ऑनलाइन बुकिंगसाठी <a href="https://msrtcors.co.in" target="_blank" rel="noopener noreferrer" className="underline font-medium">msrtcors.co.in</a> भेट द्या.</li>
          <li>• टोल फ्री: 1800 22 1250</li>
        </ul>
      </section>
    </div>
  );
}
