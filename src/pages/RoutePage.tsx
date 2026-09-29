import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { Spinner, EmptyState } from '@/components/ui';
import { BusCard } from '@/components/BusCard';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ArrowRightIcon, BusIcon } from '@/components/Icons';
import { useRouteResults } from '@/hooks/useRouteResults';
import { useFavorites } from '@/hooks/useFavorites';
import { parseRoutePair } from '@/utils/text';
import { SITE_URL } from '@/config';

export function RoutePage() {
  const { pair = '' } = useParams();
  const { core, stopById, status } = useData();
  const { t, lang } = useI18n();
  const { has, toggleRoute } = useFavorites();

  const knownPairs = useMemo(
    () => (core?.routes ?? []).map((r) => ({ from: r.from, to: r.to })),
    [core?.routes],
  );
  const parsed = useMemo(() => parseRoutePair(pair, knownPairs), [pair, knownPairs]);
  const from = parsed?.from ?? null;
  const to = parsed?.to ?? null;

  const fromStop = from ? stopById.get(from) : undefined;
  const toStop = to ? stopById.get(to) : undefined;
  const { loading, results } = useRouteResults(from, to);

  if (status === 'loading') return <Spinner label={t('common.loading')} />;

  if (!fromStop || !toStop) {
    return (
      <div className="container-app mt-6">
        <EmptyState title={t('results.none')} hint={t('results.noneHint')}>
          <Link to="/" className="btn-primary mt-2">
            {t('common.back')}
          </Link>
        </EmptyState>
      </div>
    );
  }

  const favId = `${from}__${to}`;
  const title = `${fromStop.name} to ${toStop.name} ST Bus Timetable – MSRTC Bus Timings`;
  const description = `${fromStop.name} to ${toStop.name} MSRTC ST bus timetable — ${results.length} buses with departure, service type and duration. ${fromStop.nameMr} ते ${toStop.nameMr} एसटी बस वेळापत्रक.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    numberOfItems: results.length,
    itemListElement: results.slice(0, 25).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'BusTrip',
        departureBusStop: { '@type': 'BusStop', name: fromStop.name },
        arrivalBusStop: { '@type': 'BusStop', name: toStop.name },
        departureTime: r.trip.departure,
        provider: { '@type': 'Organization', name: 'MSRTC (unofficial listing)' },
      },
    })),
  };

  return (
    <div className="container-app">
      <Seo title={title} description={description} path={`/st-bus/${pair}`} jsonLd={jsonLd} />

      <nav className="mt-4 text-xs text-slate-400">
        <Link to="/" className="hover:text-slate-600">
          {t('nav.home')}
        </Link>{' '}
        ›{' '}
        <span className="text-slate-600">
          {fromStop.name} → {toStop.name}
        </span>
      </nav>

      <header className="mt-2 flex items-start justify-between gap-2">
        <div>
          <h1 className="flex flex-wrap items-center gap-x-2 text-xl font-bold text-slate-900">
            {localName(lang, fromStop)}
            <ArrowRightIcon width={20} height={20} className="text-st-500" />
            {localName(lang, toStop)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {lang === 'en' ? `${fromStop.nameMr} ते ${toStop.nameMr} एसटी बस वेळापत्रक` : t('app.title')}
          </p>
        </div>
        <FavoriteButton
          active={has(favId)}
          label={has(favId) ? t('common.remove') : t('common.save')}
          onToggle={() =>
            toggleRoute({ id: favId, from: from!, to: to!, fromName: fromStop.name, toName: toStop.name })
          }
        />
      </header>

      {loading ? (
        <Spinner label={t('results.loading')} />
      ) : results.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon={<BusIcon width={28} height={28} />} title={t('results.none')} hint={t('results.noneHint')} />
        </div>
      ) : (
        <>
          <p className="mb-2 mt-5 text-sm font-medium text-slate-600">
            {t('results.count', { count: results.length })}
          </p>
          <div className="space-y-3">
            {results.map((r) => (
              <BusCard key={r.trip.id} result={r} from={fromStop} to={toStop} />
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-center text-[11px] text-slate-400">{SITE_URL.replace(/^https?:\/\//, '')}</p>
    </div>
  );
}
