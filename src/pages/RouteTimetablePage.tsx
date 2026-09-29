/**
 * RouteTimetablePage  —  /route/:slug
 *
 * Like lalparibus.in/mumbai-to-pune-bus-timetable/
 * Shows a full timetable for a specific route pair: destination, all departure
 * times, via stops, and bus type.
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { Spinner, EmptyState, SectionTitle } from '@/components/ui';
import { BusCard } from '@/components/BusCard';
import { FavoriteButton } from '@/components/FavoriteButton';
import { RouteSubscribeButton } from '@/components/RouteSubscribeButton';
import { AdBanner } from '@/components/AdBanner';
import { ArrowRightIcon, ClockIcon } from '@/components/Icons';
import { useRouteResults } from '@/hooks/useRouteResults';
import { useFavorites } from '@/hooks/useFavorites';
import { formatTime12 } from '@/utils/format';
import { parseRoutePair, routePairSlug } from '@/utils/text';

export function RouteTimetablePage() {
  const { slug = '' } = useParams();
  const { core, stopById, routeById, status } = useData();
  const { t, lang } = useI18n();
  const { has, toggleRoute } = useFavorites();

  // Resolve from → to from the slug
  const knownPairs = useMemo(
    () => (core?.routes ?? []).map(r => ({ from: r.from, to: r.to })),
    [core?.routes],
  );
  const pair = useMemo(() => parseRoutePair(slug, knownPairs), [slug, knownPairs]);

  const fromStop = pair ? stopById.get(pair.from) : undefined;
  const toStop   = pair ? stopById.get(pair.to)   : undefined;

  // All trips (no date filter) via existing hook
  const { loading, allResults } = useRouteResults(pair?.from ?? null, pair?.to ?? null);

  const favId = pair ? `${pair.from}__${pair.to}` : '';

  if (status === 'loading') return <Spinner label={t('common.loading')} />;

  if (!fromStop || !toStop || !pair) {
    return (
      <div className="container-app mt-6">
        <EmptyState title="मार्ग सापडला नाही" hint="URL तपासा किंवा मुख्यपृष्ठावर परत जा.">
          <Link to="/" className="btn-primary mt-2">मुख्यपृष्ठ</Link>
        </EmptyState>
      </div>
    );
  }

  const fromName = localName(lang, fromStop);
  const toName   = localName(lang, toStop);

  // First / last bus from results
  const sortedDepartures = allResults
    .map(r => r.trip.departure)
    .sort();
  const firstBus = sortedDepartures[0];
  const lastBus  = sortedDepartures[sortedDepartures.length - 1];

  // Get the route object for distance etc.
  const route = core?.routes.find(r => r.from === pair.from && r.to === pair.to);
  const viaStops = route?.stops
    .slice(1, -1)
    .map(sid => stopById.get(sid))
    .filter(Boolean)
    .map(s => localName(lang, s!))
    .join(' → ');

  return (
    <div className="container-app">
      <Seo
        title={`${fromName} to ${toName} Bus Timetable — MSRTC ST | ${fromStop.nameMr} ते ${toStop.nameMr}`}
        description={`${fromName} to ${toName} MSRTC ST bus timings. ${allResults.length} buses daily. First bus ${firstBus ?? ''}, last bus ${lastBus ?? ''}. ${fromStop.nameMr} ते ${toStop.nameMr} एसटी बस वेळापत्रक.`}
        path={`/route/${slug}`}
        jsonLd={allResults.length > 0 ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: `${fromStop.name} to ${toStop.name} Bus Timetable`,
          numberOfItems: allResults.length,
          itemListElement: allResults.slice(0, 15).map((r, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'BusTrip',
              name: `${fromStop.name} → ${toStop.name}`,
              departureTime: r.trip.departure,
              provider: { '@type': 'Organization', name: 'MSRTC' },
            },
          })),
        } : undefined}
      />

      {/* Route hero */}
      <div className="mt-4 card p-5 text-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">बस मार्ग वेळापत्रक</p>
            <h1 className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xl font-extrabold leading-tight">
              {fromName}
              <ArrowRightIcon width={18} height={18} className="text-slate-500 flex-shrink-0" />
              {toName}
            </h1>
            {lang === 'en' && (
              <p className="mt-1 text-sm text-slate-500">
                {fromStop.nameMr} → {toStop.nameMr}
              </p>
            )}
            {viaStops && (
              <p className="mt-1.5 text-xs text-slate-500">
                मार्गे: {viaStops}
              </p>
            )}
            {route?.distanceKm && (
              <p className="mt-1 text-xs text-slate-500">अंतर: {route.distanceKm} km</p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <FavoriteButton
              active={has(favId)}
              label={has(favId) ? t('common.remove') : t('common.save')}
              onToggle={() =>
                toggleRoute({
                  id: favId,
                  from: pair.from,
                  to: pair.to,
                  fromName: fromStop.name,
                  toName: toStop.name,
                })
              }
            />
            <RouteSubscribeButton routeId={pair.from + '-to-' + pair.to} />
          </div>
        </div>

        {/* Quick stats */}
        {allResults.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#f4f3ef] p-2.5 text-center">
              <p className="text-lg font-bold">{allResults.length}</p>
              <p className="text-[11px] text-slate-500">बसेस</p>
            </div>
            <div className="rounded-xl bg-[#f4f3ef] p-2.5 text-center">
              <div className="flex items-center justify-center gap-1">
                <ClockIcon width={12} height={12} className="text-slate-500" />
                <p className="text-sm font-bold">{firstBus}</p>
              </div>
              <p className="text-[11px] text-slate-500">पहिली बस</p>
            </div>
            <div className="rounded-xl bg-[#f4f3ef] p-2.5 text-center">
              <div className="flex items-center justify-center gap-1">
                <ClockIcon width={12} height={12} className="text-slate-500" />
                <p className="text-sm font-bold">{lastBus}</p>
              </div>
              <p className="text-[11px] text-slate-500">शेवटची बस</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick-view departure time pills (lalparibus-style) */}
      {allResults.length > 0 && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">
            {fromName} वरून सुटण्याच्या वेळा
          </p>
          <div className="flex flex-wrap gap-2">
            {sortedDepartures.map((dep, i) => (
              <span
                key={`${dep}-${i}`}
                className="inline-block rounded-lg bg-st-50 px-3 py-1.5 text-sm font-mono font-semibold text-st-800 ring-1 ring-st-100"
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      <AdBanner slot="route-top" />
      {/* Detailed bus cards */}
      <SectionTitle>
        सविस्तर वेळापत्रक ({allResults.length} बसेस)
      </SectionTitle>

      {loading ? (
        <Spinner label="वेळापत्रक लोड होत आहे..." />
      ) : allResults.length === 0 ? (
        <EmptyState
          icon={<span className="text-4xl">🚌</span>}
          title="या मार्गावर बस माहिती नाही"
          hint="लवकरच अधिक डेटा जोडला जाईल."
        >
          <Link to="/" className="btn-ghost mt-2 text-sm">परत जा</Link>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {allResults.map(r => (
            <BusCard key={r.trip.id} result={r} from={fromStop} to={toStop} />
          ))}
        </div>
      )}
      <AdBanner slot="route-bottom" />
      <p className="mt-2 text-center text-[11px] text-slate-400">“उपलब्ध वेळापत्रकानुसार” — ही वेळ थेट Live नाही. शेवटचे अपडेट: {core?.metadata.generatedAt ? new Date(core.metadata.generatedAt).toLocaleDateString('mr-IN') : ''} · स्रोत: {core?.metadata.source}</p>

      {/* FAQ section (SEO + user value) */}
      <section className="mt-8 space-y-4">
        <h2 className="text-base font-bold text-slate-800">
          {fromName} ते {toName} बस बद्दल सामान्य प्रश्न
        </h2>

        {[
          {
            q: `${fromName} ते ${toName} पहिली बस कधी आहे?`,
            a: firstBus ? `${fromName} वरून ${toName} साठी पहिली बस ${firstBus} वाजता सुटते.` : 'माहिती लवकरच उपलब्ध होईल.',
          },
          {
            q: `${fromName} ते ${toName} शेवटची बस कधी आहे?`,
            a: lastBus ? `${fromName} वरून ${toName} साठी शेवटची बस ${lastBus} वाजता सुटते.` : 'माहिती लवकरच उपलब्ध होईल.',
          },
          {
            q: `${fromName} ते ${toName} दररोज किती बसेस आहेत?`,
            a: `${fromName} वरून ${toName} साठी दररोज अंदाजे ${allResults.length} बसेस उपलब्ध आहेत.`,
          },
          route?.distanceKm ? {
            q: `${fromName} ते ${toName} अंतर किती आहे?`,
            a: `${fromName} ते ${toName} रस्त्याने अंदाजे ${route.distanceKm} किमी आहे.`,
          } : null,
        ].filter(Boolean).map((faq, i) => (
          <details key={i} className="rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800 select-none list-none flex items-center justify-between">
              {(faq as any).q}
              <span className="text-slate-400 text-lg">+</span>
            </summary>
            <p className="px-4 pb-3 text-sm text-slate-600">{(faq as any).a}</p>
          </details>
        ))}
      </section>

      {/* Related routes */}
      {fromStop && (
        <section className="mt-6">
          <SectionTitle>
            {fromName} वरून इतर मार्ग
          </SectionTitle>
          <div className="grid gap-2">
            {(core?.routes ?? [])
              .filter(r => r.from === fromStop.id && r.to !== toStop.id)
              .slice(0, 6)
              .map(r => {
                const dest = stopById.get(r.to);
                if (!dest) return null;
                return (
                  <Link
                    key={r.id}
                    to={`/route/${routePairSlug(r.from, r.to)}`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-st-300 hover:shadow-sm transition-all"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      {localName(lang, fromStop)}
                      <ArrowRightIcon width={14} height={14} className="text-st-400" />
                      {localName(lang, dest)}
                    </span>
                    <ArrowRightIcon width={14} height={14} className="text-slate-300" />
                  </Link>
                );
              })}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
        ⚠️ वेळापत्रकात बदल होण्याची शक्यता असते. प्रवासापूर्वी अधिकृत MSRTC काउंटर किंवा{' '}
        <a href="https://msrtcors.co.in" target="_blank" rel="noopener noreferrer" className="underline">
          msrtcors.co.in
        </a>{' '}
        वर तपासा.
      </p>
    </div>
  );
}
