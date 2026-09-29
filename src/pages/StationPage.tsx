import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Route, Trip } from '@/types/domain';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { Spinner, EmptyState, SectionTitle } from '@/components/ui';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ArrowRightIcon, ChevronRightIcon, ClockIcon, PinIcon } from '@/components/Icons';
import { useFavorites } from '@/hooks/useFavorites';
import { loadSchedules } from '@/services/data';
import { formatTime12, formatHumanDate } from '@/utils/format';
import { routePairSlug } from '@/utils/text';

interface RouteTimes {
  route: Route;
  times: string[];
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function StationPage() {
  const { id = '' } = useParams();
  const { core, stopById, divisionById, depotById, status } = useData();
  const { t, lang } = useI18n();
  const { has, toggleStation } = useFavorites();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  const station = stopById.get(id);
  const division = station ? divisionById.get(station.division) : undefined;

  const routesFrom = useMemo(() => (core?.routes ?? []).filter((r) => r.from === id), [core?.routes, id]);
  const routesTo = useMemo(() => (core?.routes ?? []).filter((r) => r.to === id), [core?.routes, id]);

  // Routes live in the schedule file of the division whose board lists them,
  // so load every division that has a route touching this place.
  const slugs = useMemo(() => {
    const s = new Set<string>();
    for (const r of [...routesFrom, ...routesTo]) {
      const d = divisionById.get(r.division);
      if (d) s.add(d.slug);
    }
    return [...s];
  }, [routesFrom, routesTo, divisionById]);

  useEffect(() => {
    setTrips(null);
    if (slugs.length === 0) { setTrips([]); return; }
    void loadSchedules(slugs).then(setTrips).catch(() => setTrips([]));
  }, [slugs.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps

  const [fromTimes, toTimes] = useMemo(() => {
    const byRoute = new Map<string, string[]>();
    for (const tp of trips ?? []) {
      const list = byRoute.get(tp.routeId) ?? [];
      list.push(tp.departure);
      byRoute.set(tp.routeId, list);
    }
    const build = (routes: Route[]): RouteTimes[] =>
      routes
        .map((route) => ({ route, times: [...new Set(byRoute.get(route.id) ?? [])].sort() }))
        .filter((x) => x.times.length > 0)
        .sort((a, b) => b.times.length - a.times.length);
    return [build(routesFrom), build(routesTo)];
  }, [trips, routesFrom, routesTo]);

  const allDepartures = useMemo(() => fromTimes.flatMap((x) => x.times).sort(), [fromTimes]);

  if (status === 'loading') return <Spinner label={t('common.loading')} />;
  if (!station) {
    return (
      <div className="container-app mt-6">
        <EmptyState title={t('results.none')}>
          <Link to="/" className="btn-primary mt-2">{t('common.back')}</Link>
        </EmptyState>
      </div>
    );
  }

  const depot = station.depot ? depotById.get(station.depot) : undefined;
  const district = core?.districts.find((d) => d.name === station.district);
  const now = nowHHMM();
  const title = `${station.name} ST Bus Timetable – MSRTC | ${station.nameMr} एसटी बस वेळापत्रक`;
  const description = `${station.name} (${station.nameMr}) MSRTC ST bus timings — buses from and to ${station.name}${station.district !== 'Unknown' ? `, ${station.district} district` : ''}.`;
  const shownFrom = showAll ? fromTimes : fromTimes.slice(0, 12);

  return (
    <div className="container-app pb-8">
      <Seo
        title={title}
        description={description}
        path={`/station/${station.id}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BusStation',
          name: station.name,
          alternateName: [station.nameMr, station.nameHi],
          address: { '@type': 'PostalAddress', addressRegion: 'Maharashtra', addressLocality: station.district },
        }}
      />

      <header className="card mt-4 flex items-start justify-between gap-2 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
            <PinIcon width={16} height={16} />
            <span className="text-xs font-bold uppercase tracking-wide">
              {station.taluka ? (lang === 'mr' ? 'तालुका बस स्थानक' : 'Taluka bus stand') : t('station.busStand')}
            </span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900">{localName(lang, station)}</h1>
          <p className="text-sm text-slate-500">
            {lang === 'en' ? station.nameMr : station.name}
            {station.district !== 'Unknown' && (
              <>
                {' · '}
                {district ? <Link to={`/district/${district.id}`} className="underline decoration-slate-300">{lang === 'mr' ? `${district.nameMr} जिल्हा` : `${district.name} district`}</Link> : station.district}
              </>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            {division && <span className="chip bg-slate-100 text-slate-600">{t('station.division')}: {localName(lang, division)}</span>}
            {depot && <span className="chip bg-slate-100 text-slate-600">{t('station.depot')}: {localName(lang, depot)}</span>}
            {station.talukas?.map((tk) => <span key={tk} className="chip bg-slate-100 text-slate-600">{lang === 'mr' ? 'तालुका' : 'Taluka'}: {tk}</span>)}
          </div>
        </div>
        <FavoriteButton
          active={has(station.id)}
          label={has(station.id) ? t('common.remove') : t('common.save')}
          onToggle={() => toggleStation({ id: station.id, stationId: station.id, name: station.name })}
        />
      </header>

      {trips === null ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <>
          {allDepartures.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                [lang === 'mr' ? 'पहिली बस' : 'First bus', formatTime12(allDepartures[0])],
                [lang === 'mr' ? 'पुढील बस' : 'Next bus', formatTime12(allDepartures.find((x) => x >= now) ?? allDepartures[0])],
                [lang === 'mr' ? 'शेवटची बस' : 'Last bus', formatTime12(allDepartures[allDepartures.length - 1])],
              ].map(([l, v]) => (
                <div key={l} className="card p-2.5">
                  <div className="text-[11px] text-slate-500">{l}</div>
                  <div className="mt-0.5 flex items-center justify-center gap-1 text-base font-bold tabular-nums text-slate-900">
                    <ClockIcon width={14} height={14} className="text-slate-400" />{v}
                  </div>
                </div>
              ))}
            </div>
          )}

          <SectionTitle>
            {lang === 'mr' ? `${localName(lang, station)} येथून सुटणाऱ्या बस` : `Buses from ${localName(lang, station)}`}
          </SectionTitle>
          {fromTimes.length === 0 ? (
            <p className="card p-4 text-sm text-slate-500">
              {lang === 'mr'
                ? 'या स्थानकाचे स्वतःचे वेळापत्रक अद्याप उपलब्ध नाही. खाली इतर स्थानकांवरून येथे येणाऱ्या बस पाहा.'
                : "This stand's own departure board isn't transcribed yet — see buses coming here from other stands below."}
            </p>
          ) : (
            <div className="grid gap-2">
              {shownFrom.map(({ route, times }) => (
                <RouteRow key={route.id} route={route} times={times} otherId={route.to} now={now} />
              ))}
              {fromTimes.length > 12 && !showAll && (
                <button className="btn-ghost text-sm" onClick={() => setShowAll(true)}>
                  {lang === 'mr' ? `सर्व ${fromTimes.length} ठिकाणे दाखवा` : `Show all ${fromTimes.length} destinations`}
                </button>
              )}
            </div>
          )}

          {toTimes.length > 0 && (
            <>
              <SectionTitle>
                {lang === 'mr' ? `${localName(lang, station)} ला येणाऱ्या बस` : `Buses to ${localName(lang, station)}`}
              </SectionTitle>
              <p className="-mt-1 mb-2 text-xs text-slate-500">
                {lang === 'mr' ? 'वेळ = मूळ स्थानकावरून सुटण्याची वेळ' : 'Times shown are departures from the origin stand'}
              </p>
              <div className="grid gap-2">
                {toTimes.slice(0, 30).map(({ route, times }) => (
                  <RouteRow key={route.id} route={route} times={times} otherId={route.from} now={now} incoming />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        {lang === 'mr' ? 'स्रोत: एसटी महामंडळ अधिकृत विभागीय वेळापत्रक' : 'Source: official MSRTC division timetables'}
        {division?.timetablePdf && (
          <> · <a href={division.timetablePdf} target="_blank" rel="noopener noreferrer" className="underline">PDF</a></>
        )}
        {' · '}{t('about.updated')}: {core && formatHumanDate(core.metadata.generatedAt)}
      </p>
    </div>
  );
}

function RouteRow({ route, times, otherId, now, incoming = false }: { route: Route; times: string[]; otherId: string; now: string; incoming?: boolean }) {
  const { stopById } = useData();
  const { lang } = useI18n();
  const other = stopById.get(otherId);
  if (!other) return null;
  const next = times.find((x) => x >= now);
  return (
    <Link to={`/st-bus/${routePairSlug(route.from, route.to)}`} className="card-hover block px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900">
          {incoming && <span className="truncate">{localName(lang, other)}</span>}
          {incoming && <ArrowRightIcon width={14} height={14} className="shrink-0 text-slate-400" />}
          {!incoming && <ArrowRightIcon width={14} height={14} className="shrink-0 text-slate-400" />}
          {!incoming && <span className="truncate">{localName(lang, other)}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
          {times.length} {lang === 'mr' ? 'बस' : times.length === 1 ? 'bus' : 'buses'}
          <ChevronRightIcon width={14} height={14} className="text-slate-300" />
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {times.slice(0, 14).map((tm) => (
          <span
            key={tm}
            className="rounded-md px-1.5 py-0.5 text-[12px] tabular-nums"
            style={tm === next ? { background: 'var(--accent)', color: '#fff' } : { background: '#f3f2ee', color: '#3b4148' }}
          >
            {tm}
          </span>
        ))}
        {times.length > 14 && <span className="px-1 text-[12px] text-slate-400">+{times.length - 14}</span>}
      </div>
    </Link>
  );
}
