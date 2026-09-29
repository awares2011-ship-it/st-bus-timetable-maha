import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { Spinner, EmptyState } from '@/components/ui';
import { ServiceBadge, serviceRole } from '@/components/ServiceBadge';
import { FavoriteButton } from '@/components/FavoriteButton';
import { BackButton } from '@/components/BackButton';
import { ArrowRightIcon, BusIcon, SwapIcon } from '@/components/Icons';
import { InlineAdBanner } from '@/components/AdBanner';
import { useJourney, type ConnectionView } from '@/hooks/useJourney';
import { useFavorites } from '@/hooks/useFavorites';
import { addRecent } from '@/services/db';
import { formatHumanDate, toISODate } from '@/utils/format';
import type { JourneyKind, PlannedTrip } from '@/search/journeyPlanner';
import type { Stop } from '@/types/domain';

type KindFilter = 'all' | JourneyKind;

const KIND_COLOR: Record<KindFilter, string> = { all: '#334155', direct: '#059669', onward: '#0284c7', passing: '#d97706' };

/** MSRTC livery colour per service family — the stripe on each result row. */
const LIVERY: Record<string, string> = {
  Ordinary: '#dc2626', Semi: '#ea580c', Hirkani: '#db2777', Shivshahi: '#7c3aed', Shivneri: '#1d4ed8',
  AcSleep: '#4338ca', Sleeper: '#0d9488', Electric: '#059669', Midi: '#d97706',
};

function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function SearchResultsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const from = params.get('from');
  const to = params.get('to');
  const today = toISODate(new Date());
  const date = params.get('date') ?? today;

  const { stopById, status } = useData();
  const { t, lang } = useI18n();
  const { has, toggleRoute } = useFavorites();
  const [kind, setKind] = useState<KindFilter>('all');
  const [stand, setStand] = useState<string>('all');
  const [hidePast, setHidePast] = useState(true);

  const fromStop = from ? stopById.get(from) : undefined;
  const toStop = to ? stopById.get(to) : undefined;
  const { loading, trips, allTrips, connections, fromStands } = useJourney(from, to, date);

  useEffect(() => {
    if (fromStop && toStop) {
      void addRecent({ id: `${from}__${to}`, from: from!, to: to!, fromName: fromStop.name, toName: toStop.name, ts: Date.now() });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, fromStop, toStop]);

  const isToday = date === today;
  const now = nowHHMM();
  const counts = useMemo(() => {
    const c = { direct: 0, onward: 0, passing: 0 } as Record<JourneyKind, number>;
    for (const p of trips) c[p.match.kind]++;
    return c;
  }, [trips]);
  const standsInUse = useMemo(() => {
    const s = new Set(trips.filter((p) => !p.match.approx).map((p) => p.match.boardStop));
    return fromStands.filter((id) => s.has(id));
  }, [trips, fromStands]);

  const shown = useMemo(
    () =>
      trips.filter(
        (p) =>
          (kind === 'all' || p.match.kind === kind) &&
          (stand === 'all' || p.match.boardStop === stand) &&
          !(hidePast && isToday && p.boardTime < now),
      ),
    [trips, kind, stand, hidePast, isToday, now],
  );
  const departedCount = isToday ? trips.filter((p) => p.boardTime < now).length : 0;

  if (status === 'loading') return <Spinner label={t('common.loading')} />;
  if (!fromStop || !toStop) {
    return (
      <div className="container-app mt-6">
        <EmptyState title={t('common.error')} hint={t('results.noneHint')}>
          <Link to="/" className="btn-primary mt-2">{t('common.back')}</Link>
        </EmptyState>
      </div>
    );
  }

  const mr = lang === 'mr';
  const favId = `${from}__${to}`;
  const cityLabel = (s: Stop) => (s.city ? (mr ? `${localName(lang, s).split(' ')[0]} (सर्व स्थानके)` : `${localName(lang, s).split(' ')[0]} (all stands)`) : localName(lang, s));
  const setDate = (d: string) => navigate(`/search?from=${from}&to=${to}&date=${d}`, { replace: true });

  return (
    <div className="container-app pb-8">
      <Seo
        title={`${fromStop.name} to ${toStop.name} ST Bus Timetable – MSRTC`}
        description={`${fromStop.name} to ${toStop.name} MSRTC ST bus timings from every depot. ${fromStop.nameMr} ते ${toStop.nameMr} एसटी बस वेळापत्रक.`}
        path="/search"
        noindex
      />

      {/* Header */}
      <div className="card mt-4 p-4">
        <BackButton className="mb-3" />
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-x-2 text-lg font-bold text-slate-900">
              {cityLabel(fromStop)}
              <ArrowRightIcon width={18} height={18} className="text-slate-400" />
              {cityLabel(toStop)}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="date"
                className="rounded-lg border px-2 py-1 text-sm"
                style={{ borderColor: 'var(--line)' }}
                value={date}
                onChange={(e) => setDate(e.target.value || today)}
                aria-label={t('search.date')}
              />
              <Link to={`/search?from=${to}&to=${from}&date=${date}`} className="chip border bg-white text-slate-600" style={{ borderColor: 'var(--line)' }}>
                <SwapIcon width={12} height={12} /> {mr ? 'परतीचा प्रवास' : 'Return'}
              </Link>
            </div>
          </div>
          <FavoriteButton
            active={has(favId)}
            label={has(favId) ? t('common.remove') : t('common.save')}
            onToggle={() => toggleRoute({ id: favId, from: from!, to: to!, fromName: fromStop.name, toName: toStop.name })}
          />
        </div>

        {!loading && trips.length > 0 && (
          <p className="mt-3 text-sm text-slate-600">
            <b className="text-slate-900">{trips.length}</b> {mr ? 'बस' : 'buses'} {isToday ? (mr ? 'आज' : 'today') : formatHumanDate(date)}
            {' · '}{counts.direct} {mr ? 'थेट' : 'direct'}
            {' · '}{counts.onward} {mr ? 'पुढे जाणाऱ्या' : 'going beyond'}
            {' · '}{counts.passing} {mr ? 'मार्गावरून जाणाऱ्या' : 'passing through'}
          </p>
        )}
      </div>

      {/* Ad Banner after header */}
      <InlineAdBanner />

      {loading ? (
        <Spinner label={t('results.loading')} />
      ) : (
        <>
          {trips.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-1.5" role="tablist">
                {(
                  [
                    ['all', mr ? 'सर्व' : 'All', trips.length],
                    ['direct', mr ? 'थेट' : 'Direct', counts.direct],
                    ['onward', mr ? 'पुढे जाणाऱ्या' : 'Going beyond', counts.onward],
                    ['passing', mr ? 'मार्गावरून' : 'Passing through', counts.passing],
                  ] as const
                ).map(([k, label, n]) => (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={kind === k}
                    onClick={() => setKind(k)}
                    disabled={n === 0 && k !== 'all'}
                    className={`chip border ${kind === k ? 'text-white' : 'bg-white text-slate-700'} disabled:opacity-40`}
                    style={kind === k ? { background: KIND_COLOR[k], borderColor: KIND_COLOR[k] } : { borderColor: 'var(--line)' }}
                  >
                    {label} <span className="opacity-70">{n}</span>
                  </button>
                ))}
              </div>
              {standsInUse.length > 1 && (
                <div className="flex flex-wrap gap-1.5">
                  {['all', ...standsInUse].map((id) => (
                    <button
                      key={id}
                      onClick={() => setStand(id)}
                      className={`chip border ${stand === id ? 'border-[color:var(--accent)] text-[color:var(--accent)]' : 'bg-white text-slate-600'}`}
                      style={stand === id ? { background: 'var(--accent-soft)' } : { borderColor: 'var(--line)' }}
                    >
                      {id === 'all' ? (mr ? 'सर्व स्थानके' : 'All stands') : localName(lang, stopById.get(id)!)}
                    </button>
                  ))}
                </div>
              )}
              {isToday && departedCount > 0 && (
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" checked={hidePast} onChange={(e) => setHidePast(e.target.checked)} />
                  {mr ? `सुटलेल्या ${departedCount} बस लपवा` : `Hide ${departedCount} already departed`}
                </label>
              )}
            </div>
          )}

          {shown.length > 0 ? (
            <ul className="card mt-3 divide-y" style={{ borderColor: 'var(--line)' }}>
              {shown.map((p) => (
                <TripRow key={`${p.trip.id}-${p.match.kind}`} p={p} multiStand={standsInUse.length > 1} next={isToday && p === shown.find((x) => x.boardTime >= now)} />
              ))}
            </ul>
          ) : (
            trips.length === 0 &&
            connections.length === 0 && (
              <div className="mt-4">
                <EmptyState
                  icon={<BusIcon width={28} height={28} />}
                  title={allTrips.length > 0 ? t('results.notRunningToday') : t('results.none')}
                  hint={
                    mr
                      ? 'या मार्गाचे वेळापत्रक अद्याप उपलब्ध नाही. जवळच्या मोठ्या स्थानकावरून शोधून पाहा.'
                      : "No published timings found for this pair yet. Try the nearest bigger bus stand."
                  }
                />
              </div>
            )
          )}

          {connections.length > 0 && <Connections list={connections} fromStop={fromStop} toStop={toStop} isToday={isToday} now={now} />}

          <div className="mt-4 rounded-xl p-3 text-[12px] leading-relaxed text-slate-600" style={{ background: '#f4f3ef' }}>
            <p>
              <b>{mr ? 'थेट' : 'Direct'}</b> — {mr ? 'स्थानकाच्या फलकावर हेच ठिकाण छापलेले आहे.' : 'the stand’s board lists this destination.'}{' '}
              <b>{mr ? 'पुढे जाणाऱ्या' : 'Going beyond'}</b> —{' '}
              {mr ? 'बस पुढील गावाला जाते, हे ठिकाण वाटेत येते (नकाशावरून अंदाज; वाहकाकडे खात्री करा).' : 'the bus runs to a farther town and this place is on the way (inferred from the map — confirm with the conductor).'}{' '}
              <b>{mr ? 'मार्गावरून' : 'Passing through'}</b> —{' '}
              {mr ? 'दुसऱ्या आगारातून सुटणारी बस; येथे पोहोचण्याची वेळ अंतरावरून अंदाजे (≈).' : 'a bus from another depot; its time here is estimated from distance (≈).'}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function TripRow({ p, multiStand, next }: { p: PlannedTrip; multiStand: boolean; next: boolean }) {
  const { stopById, serviceById } = useData();
  const { lang } = useI18n();
  const mr = lang === 'mr';
  const service = serviceById.get(p.trip.serviceType);
  const origin = stopById.get(p.match.route.from);
  const terminus = stopById.get(p.match.route.to);
  const board = stopById.get(p.match.boardStop);
  const { kind, approx } = p.match;
  const stripe = service ? LIVERY[serviceRole(service)] : '#dc2626';
  return (
    <li
      className="flex items-start gap-3 py-3 pl-3 pr-3.5"
      style={{ borderLeft: `4px solid ${stripe}`, ...(next ? { background: 'var(--accent-soft)' } : {}) }}
    >
      <div className="w-16 shrink-0 text-right">
        <div className="text-lg font-bold tabular-nums leading-tight text-slate-900">
          {approx && <span className="text-sm font-semibold text-slate-400">≈</span>}
          {p.boardTime}
        </div>
        {p.arriveEst && (
          <div className="text-[11px] tabular-nums text-slate-500">
            ≈ {p.arriveEst}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {kind === 'direct' && <span className="chip bg-emerald-50 px-2 py-0.5 text-emerald-700">{mr ? 'थेट' : 'Direct'}</span>}
          {kind === 'onward' && terminus && (
            <span className="chip bg-sky-50 px-2 py-0.5 text-sky-800">{mr ? `${localName(lang, terminus)} पर्यंत` : `To ${localName(lang, terminus)}`}</span>
          )}
          {kind === 'passing' && origin && terminus && (
            <span className="chip bg-amber-50 px-2 py-0.5 text-amber-800">
              {localName(lang, origin)} → {localName(lang, terminus)}
            </span>
          )}
          {service && <ServiceBadge service={service} />}
        </div>
        {p.match.timedAt && stopById.get(p.match.timedAt) && (
          <p className="mt-1 text-xs font-medium text-slate-600">
            {mr
              ? `${localName(lang, stopById.get(p.match.timedAt)!)} येथे ${p.trip.departure} (छापील वेळ)`
              : `At ${localName(lang, stopById.get(p.match.timedAt)!)} ${p.trip.departure} (printed time)`}
          </p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          {kind === 'passing'
            ? mr
              ? `${localName(lang, origin!)} येथून ${p.trip.departure} ला सुटते`
              : `Leaves ${localName(lang, origin!)} at ${p.trip.departure}`
            : multiStand && board
              ? `${mr ? 'स्थानक' : 'From'}: ${localName(lang, board)}`
              : null}
          {p.match.inferred && kind !== 'passing' && (mr ? ' · वाटेत थांबा (अंदाज)' : ' · stop here inferred')}
        </p>
      </div>
      {next && <span className="shrink-0 self-center text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{mr ? 'पुढील' : 'NEXT'}</span>}
    </li>
  );
}

function Connections({ list, fromStop, toStop, isToday, now }: { list: ConnectionView[]; fromStop: Stop; toStop: Stop; isToday: boolean; now: string }) {
  const { stopById } = useData();
  const { lang } = useI18n();
  const mr = lang === 'mr';
  const times = (ts: { departure: string }[]) => {
    const u = [...new Set(ts.map((x) => x.departure))];
    return isToday ? u.filter((x) => x >= now) : u;
  };
  return (
    <section className="mt-5">
      <h2 className="text-base font-bold text-slate-900">{mr ? 'बदलून जाण्याचे पर्याय' : 'With one change'}</h2>
      <p className="muted text-xs">{mr ? 'मधल्या स्थानकावर बस बदला. पोहोचण्याच्या वेळा उपलब्ध नसल्याने पुरेसा वेळ ठेवा.' : 'Change buses at a hub. Arrival times aren’t published, so allow a margin.'}</p>
      <div className="mt-2 space-y-2">
        {list.map((c) => {
          const hub = stopById.get(c.hub);
          if (!hub) return null;
          return (
            <div key={c.hub} className="card p-3">
              <p className="text-sm font-semibold text-slate-900">
                {localName(lang, fromStop)} → <span style={{ color: 'var(--accent)' }}>{localName(lang, hub)}</span> → {localName(lang, toStop)}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {[
                  [`${localName(lang, fromStop)} → ${localName(lang, hub)}`, times(c.firstTrips)],
                  [`${localName(lang, hub)} → ${localName(lang, toStop)}`, times(c.secondTrips)],
                ].map(([label, ts]) => (
                  <div key={label as string}>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label as string}</p>
                    <p className="mt-0.5 flex flex-wrap gap-1">
                      {(ts as string[]).slice(0, 16).map((x) => (
                        <span key={x} className="rounded-md px-1.5 py-0.5 text-[12px] tabular-nums" style={{ background: '#f3f2ee' }}>{x}</span>
                      ))}
                      {(ts as string[]).length === 0 && <span className="text-xs text-slate-400">{mr ? 'आज आणखी बस नाही' : 'no more today'}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
