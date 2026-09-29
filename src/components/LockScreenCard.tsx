import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n/I18nContext';
import {
  FREQUENCIES, getFrequency, setFrequency, planNotifications, requestLockScreenPermission, isNativeApp,
  type Frequency, type PlannedNotification,
} from '@/services/lockScreenNotifications';
import { setOptedIn } from '@/services/notifications';
import { InstallButton } from './InstallButton';

const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || isNativeApp());

/**
 * Turn lock-screen alerts on/off, pick how often, and preview the next one as
 * it will look on the phone's lock screen.
 * `compact` = the one-tap prompt used on the home page while alerts are off.
 */
export function LockScreenCard({ compact = false }: { compact?: boolean }) {
  const { lang } = useI18n();
  const mr = lang === 'mr';
  const [freq, setFreq] = useState<Frequency | null>(null);
  const [next, setNext] = useState<PlannedNotification | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => { void getFrequency().then(setFreq); }, []);
  useEffect(() => {
    // Preview uses the every-4-hours plan even while off, so people see what they'd get.
    void planNotifications(freq && freq !== 'off' ? freq : 'h4', lang).then((p) => setNext(p[0] ?? null));
  }, [freq, lang]);

  const choose = async (f: Frequency) => {
    if (f !== 'off' && !(await requestLockScreenPermission())) { setDenied(true); return; }
    setDenied(false);
    await setOptedIn(f !== 'off');
    await setFrequency(f, lang);
    setFreq(f);
  };

  if (freq === null) return null;
  if (compact && freq !== 'off') return null;

  const time = next ? new Date(next.at).toLocaleTimeString(mr ? 'mr-IN' : 'en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
  const preview = next && (
    <div className="rounded-[22px] p-3 text-white shadow-inner" style={{ background: 'linear-gradient(160deg,#1e1b4b,#312e81 45%,#0f172a)' }}>
      <p className="text-center text-2xl font-light tabular-nums">{time}</p>
      <p className="mb-2 text-center text-[10px] text-white/60">{mr ? 'लॉक स्क्रीन पूर्वावलोकन' : 'Lock-screen preview'}</p>
      <div className="flex gap-2.5 rounded-2xl bg-white/95 p-2.5 text-slate-900 shadow">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white" style={{ background: next.color }}>🚌</span>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500">{mr ? 'एसटी वेळापत्रक · आता' : 'ST Timetable · now'}</p>
          <p className="truncate text-[13px] font-bold" style={{ color: next.color }}>{next.title}</p>
          <p className="line-clamp-2 text-[12px] leading-snug text-slate-600">{next.body}</p>
        </div>
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="container-app mt-4">
        <div className="overflow-hidden rounded-2xl p-4 text-white shadow-md" style={{ background: 'var(--mc-cool)' }}>
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden>🔔</span>
            <div className="min-w-0 flex-1">
              <p className="text-base font-extrabold leading-snug">{mr ? 'लॉक स्क्रीनवर एसटी सूचना' : 'ST alerts on your lock screen'}</p>
              <p className="mt-0.5 text-[13px] text-white/90">
                {mr ? 'पास संपण्याची आठवण, सवलतीचे बदल, सणाची गर्दी — दर ४ तासांनी, रात्री नाही.' : 'Pass expiry, concession changes, festival rush — every 4 hours, never at night.'}
              </p>
            </div>
          </div>
          <div className="mt-3">{preview}</div>
          <button onClick={() => void choose('h4')} className="mt-3 w-full rounded-xl bg-white py-3 text-[15px] font-extrabold" style={{ color: '#7c3aed' }}>
            {mr ? 'चालू करा' : 'Turn on'}
          </button>
          {denied && <p className="mt-2 text-xs text-white/90">{mr ? 'परवानगी नाकारली — फोनच्या सेटिंग्जमध्ये या अ‍ॅपच्या सूचना चालू करा.' : 'Permission denied — enable notifications for this app in phone settings.'}</p>}
        </div>
      </div>
    );
  }

  return (
    <section className="card mc-top mt-5 p-4 pt-5">
      <h2 className="text-sm font-bold text-slate-900">🔔 {mr ? 'लॉक स्क्रीनवर सूचना' : 'Lock-screen alerts'}</h2>
      <p className="text-xs text-slate-500">
        {mr ? 'रात्री १० ते सकाळी ७ कोणतीही सूचना नाही. प्रत्येक सूचना तिच्या रंगात.' : 'Nothing between 10pm and 7am. Each alert in its colour.'}
      </p>
      <div className="mt-3 grid gap-2">
        {FREQUENCIES.map((f) => {
          const on = freq === f.id;
          return (
            <button key={f.id} onClick={() => void choose(f.id)} aria-pressed={on}
              className="flex items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm font-semibold transition-colors"
              style={on ? { background: '#ede9fe', borderColor: '#7c3aed', color: '#5b21b6' } : { borderColor: 'var(--line)', color: '#334155', background: '#fff' }}>
              {mr ? f.mr : f.en}
              <span className="grid h-5 w-5 place-items-center rounded-full border-2" style={{ borderColor: on ? '#7c3aed' : '#cbd5e1' }}>
                {on && <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#7c3aed' }} />}
              </span>
            </button>
          );
        })}
      </div>
      {denied && <p className="mt-2 text-xs font-semibold text-rose-600">{mr ? 'परवानगी नाकारली — फोनच्या सेटिंग्जमध्ये या अ‍ॅपच्या सूचना चालू करा.' : 'Permission denied — enable notifications for this app in phone settings.'}</p>}
      {preview && <div className="mt-3">{preview}</div>}
      {!isStandalone() && (
        <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: '#fef9c3', color: '#854d0e' }}>
          {mr ? 'फोनच्या लॉक स्क्रीनवर नियमित सूचनांसाठी अ‍ॅप इंस्टॉल करा. ब्राउझरमध्ये सूचना फक्त अ‍ॅप उघडल्यावर येतात.'
              : 'Install the app to get regular lock-screen alerts. In the browser, alerts only arrive while the app is open.'}
          <div className="mt-2"><InstallButton /></div>
        </div>
      )}
    </section>
  );
}
