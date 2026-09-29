import type { ResultTrip } from '@/search/searchEngine';
import type { Stop } from '@/types/domain';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { formatTime12, formatDuration, formatDays } from '@/utils/format';
import { ServiceBadge, serviceRole } from './ServiceBadge';

const ROLE_STRIPE: Record<string, string> = {
  Ordinary:  'bg-red-500',
  Semi:      'bg-orange-500',
  Hirkani:   'bg-pink-500',
  Shivshahi: 'bg-violet-500',
  Shivneri:  'bg-blue-500',
  AcSleep:   'bg-indigo-500',
  Sleeper:   'bg-teal-500',
  Electric:  'bg-emerald-500',
  Midi:      'bg-amber-500',
};


import { SourceTag } from './SourceTag';
import { BusImage } from './BusPhoto';
import { ArrowDownIcon } from './Icons';
import type { Weekday } from '@/types/domain';

export function BusCard({ result, from, to }: { result: ResultTrip; from: Stop; to: Stop }) {
  const { serviceById, depotById, stopById } = useData();
  const { t, lang } = useI18n();
  const { trip } = result;
  const service = serviceById.get(trip.serviceType);
  const depot = trip.depot ? depotById.get(trip.depot) : undefined;

  const dayLabel = (d: Weekday) => t(`days.${d}`);
  const daysStr = formatDays(trip.operatingDays, dayLabel, t('result.everyday'));
  const duration = result.showArrival
    ? formatDuration(trip.durationMin, t('result.hours'), t('result.minutes'))
    : '';
  const viaNames = result.via
    .map((id) => stopById.get(id))
    .filter((s): s is Stop => Boolean(s))
    .map((s) => localName(lang, s));


  return (
    <article className="card rise overflow-hidden">
      {/* Gradient colour stripe top */}
      <div className={`h-1.5 w-full ${service ? ROLE_STRIPE[serviceRole(service)] : ROLE_STRIPE.Ordinary}`} aria-hidden />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Bus image */}
          {service && (
            <div className="mt-1 h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f3f2ee]">
              <BusImage serviceId={service.id} fallback={service.image} alt={localName(lang, service)} className="h-full w-full" />
            </div>
          )}

          {/* Times + endpoints */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              {/* Departure */}
              <div className="text-center min-w-0">
                <div className="time-display">{formatTime12(trip.departure)}</div>
                <div className="mt-0.5 max-w-[5.5rem] truncate text-[11px] text-slate-500 font-medium" title={localName(lang, from)}>
                  {localName(lang, from)}
                </div>
              </div>

              <div className="flex flex-col items-center text-slate-300 px-1">
                <ArrowDownIcon width={14} height={14} />
                {duration && <span className="text-[10px] font-semibold text-slate-500 mt-0.5">{duration}</span>}
              </div>

              {/* Arrival */}
              <div className="text-center min-w-0">
                <div className={`time-display ${result.showArrival && trip.arrival ? '' : 'text-slate-300'}`}
                  style={result.showArrival && trip.arrival ? undefined : { background: 'none', WebkitTextFillColor: '#cbd5e1' }}>
                  {result.showArrival && trip.arrival ? formatTime12(trip.arrival) : '—'}
                </div>
                <div className="mt-0.5 max-w-[5.5rem] truncate text-[11px] text-slate-500 font-medium" title={localName(lang, to)}>
                  {localName(lang, to)}
                </div>
              </div>

              <div className="ml-auto">
                {result.isDirect ? (
                  <span className="chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70">{t('results.direct')}</span>
                ) : (
                  <span className="chip bg-slate-100 text-slate-600">{t('results.viaLabel')}</span>
                )}
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {service && <ServiceBadge service={service} />}
              <span className="text-xs text-slate-500 font-medium">
                {daysStr}
              </span>
            </div>

            {viaNames.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                <span className="font-medium text-slate-600">{t('result.via')}:</span> {viaNames.join(' · ')}
              </p>
            )}
            {depot && (
              <p className="mt-0.5 text-xs text-slate-400">
                {t('result.depot')}: {localName(lang, depot)}
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-2">
          <SourceTag trip={trip} />
        </div>
      </div>
    </article>
  );
}
