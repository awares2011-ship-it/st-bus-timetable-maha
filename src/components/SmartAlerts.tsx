import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { useSmartAlerts, type SmartAlert } from '@/services/smartAlerts';
import { TONES } from '@/data/schemes';
import { BellIcon, ChevronRightIcon } from './Icons';

/** Header bell: badge shows the unread count, coloured by the most important unread alert. */
export function AlertBell() {
  const { lang } = useI18n();
  const { unread } = useSmartAlerts(lang);
  const top = unread[0];
  return (
    <Link
      to="/alerts"
      aria-label={lang === 'mr' ? `सूचना (${unread.length} नवीन)` : `Alerts (${unread.length} new)`}
      className="relative grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white hover:bg-white/30"
    >
      <BellIcon width={20} height={20} />
      {top && (
        <span
          className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold text-white ring-2 ring-white"
          style={{ background: TONES[top.tone].color }}
        >
          {unread.length > 9 ? '9+' : unread.length}
        </span>
      )}
    </Link>
  );
}

export function AlertCard({ alert, unread, onOpen, compact = false }: { alert: SmartAlert; unread?: boolean; onOpen?: () => void; compact?: boolean }) {
  const { lang } = useI18n();
  const tone = TONES[alert.tone];
  const mr = lang === 'mr';
  const body = (
    <div
      className="flex gap-3 rounded-2xl p-3.5 transition-transform active:scale-[.99]"
      style={{ background: tone.soft, borderLeft: `5px solid ${tone.color}` }}
    >
      <span className="text-xl leading-none" aria-hidden>{tone.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: tone.color }}>
            {mr ? tone.mr : tone.en}
          </span>
          {unread && <span className="h-2 w-2 rounded-full" style={{ background: tone.color }} aria-label={mr ? 'नवीन' : 'new'} />}
        </div>
        <p className="mt-1 text-[15px] font-bold leading-snug" style={{ color: tone.color }}>{mr ? alert.titleMr : alert.titleEn}</p>
        {!compact && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-700">{mr ? alert.bodyMr : alert.bodyEn}</p>}
        {!compact && alert.source && (
          <a href={alert.source.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
            className="mt-1 inline-block text-[11px] text-slate-500 underline">
            {mr ? 'स्रोत' : 'Source'}: {alert.source.label}
          </a>
        )}
      </div>
      {alert.to && <ChevronRightIcon width={18} height={18} className="mt-1 shrink-0" style={{ color: tone.color }} />}
    </div>
  );
  return alert.to ? <Link to={alert.to} onClick={onOpen} className="block">{body}</Link> : <div onClick={onOpen}>{body}</div>;
}

/** Home page strip: the two most important unread alerts. */
export function SmartAlertStrip() {
  const { lang } = useI18n();
  const { unread, markRead } = useSmartAlerts(lang);
  if (!unread.length) return null;
  const mr = lang === 'mr';
  return (
    <div className="container-app mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="mc-heading text-sm font-bold uppercase tracking-wide text-slate-700">{mr ? 'तुमच्यासाठी सूचना' : 'Alerts for you'}</h2>
        <Link to="/alerts" className="link-accent">{mr ? `सर्व (${unread.length}) →` : `All (${unread.length}) →`}</Link>
      </div>
      <div className="grid gap-2">
        {unread.slice(0, 2).map((a) => (
          <AlertCard key={a.id} alert={a} unread compact onOpen={() => void markRead([a.id])} />
        ))}
      </div>
    </div>
  );
}
