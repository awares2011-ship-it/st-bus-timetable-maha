import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { AlertCard } from '@/components/SmartAlerts';
import { useSmartAlerts } from '@/services/smartAlerts';
import { LockScreenCard } from '@/components/LockScreenCard';
import { TONES, type Tone } from '@/data/schemes';

export function AlertsPage() {
  const { lang } = useI18n();
  const mr = lang === 'mr';
  const { alerts, read, markAllRead, markRead, profile } = useSmartAlerts(lang);
  const [filter, setFilter] = useState<Tone | 'all'>('all');
  // What was unread when the page opened stays highlighted until the next visit.
  const [freshIds, setFreshIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (freshIds || alerts.length === 0) return;
    setFreshIds(new Set(alerts.filter((a) => !read.has(a.id)).map((a) => a.id)));
    void markAllRead();
  }, [alerts, read, freshIds, markAllRead]);

  const tones = (Object.keys(TONES) as Tone[]).filter((t) => alerts.some((a) => a.tone === t));
  const shown = filter === 'all' ? alerts : alerts.filter((a) => a.tone === filter);

  return (
    <div className="container-app pb-8">
      <Seo title={mr ? 'सूचना — एसटी बस वेळापत्रक' : 'Alerts — ST Bus Timetable'} description="ST pass, concession and travel alerts" path="/alerts" noindex />
      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">🔔 {mr ? 'सूचना' : 'Alerts'}</h1>
        <Link to="/passes#profile" className="link-accent">
          {profile.categories.length ? (mr ? 'माझी माहिती बदला' : 'Edit my profile') : (mr ? 'माझी माहिती भरा' : 'Set my profile')}
        </Link>
      </div>

      {/* Colour legend doubles as the filter */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')}
          className={`chip border ${filter === 'all' ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
          {mr ? 'सर्व' : 'All'} {alerts.length}
        </button>
        {tones.map((t) => (
          <button key={t} onClick={() => setFilter(t)} className="chip border"
            style={filter === t
              ? { background: TONES[t].color, color: '#fff', borderColor: TONES[t].color }
              : { background: TONES[t].soft, color: TONES[t].color, borderColor: 'transparent' }}>
            {TONES[t].icon} {mr ? TONES[t].mr : TONES[t].en} {alerts.filter((a) => a.tone === t).length}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-2.5">
        {shown.map((a) => (
          <AlertCard key={a.id} alert={a} unread={freshIds?.has(a.id)} onOpen={() => void markRead([a.id])} />
        ))}
        {shown.length === 0 && <p className="muted py-8 text-center text-sm">{mr ? 'सध्या कोणतीही सूचना नाही 🎉' : 'Nothing right now 🎉'}</p>}
      </div>

      <LockScreenCard />

      <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
        {mr ? 'अधिकृत सूचना एसटी महामंडळ / शासनाच्या निर्णयांच्या बातम्यांवरून घेतल्या आहेत; प्रत्येकावर स्रोत दिला आहे. प्रवासापूर्वी आगारात खात्री करा. ही स्वतंत्र सेवा आहे — MSRTCशी संलग्न नाही.'
            : 'Official notices come from MSRTC / government decisions as reported, each with its source. Confirm at the depot before travelling. Independent service — not affiliated with MSRTC.'}
      </p>
    </div>
  );
}
