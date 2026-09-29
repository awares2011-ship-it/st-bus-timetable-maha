import type { Trip } from '@/types/domain';
import { useI18n } from '@/i18n/I18nContext';
import { formatHumanDate } from '@/utils/format';

/** Source transparency: every timetable row states where it came from. */
export function SourceTag({ trip }: { trip: Trip }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span
        className={`chip ring-1 ${
          trip.verified
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : 'bg-amber-50 text-amber-800 ring-amber-200'
        }`}
      >
        {trip.verified ? t('source.official') : t('source.demo')}
      </span>
      <span>
        {t('result.lastVerified')}: {formatHumanDate(trip.lastVerified)}
      </span>
    </div>
  );
}
