import { useEffect, useState } from 'react';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { InstallButton } from '@/components/InstallButton';
import { CheckIcon } from '@/components/Icons';
import { notifier, isOptedIn, setOptedIn } from '@/services/notifications';
import { formatHumanDate } from '@/utils/format';
import { BUS_PHOTOS } from '@/components/BusPhoto';

export function AboutPage() {
  const { core } = useData();
  const { t } = useI18n();
  const [optIn, setOptIn] = useState(false);
  const supported = notifier.isSupported();

  useEffect(() => {
    void isOptedIn().then(setOptIn);
  }, []);

  const toggleNotifications = async () => {
    if (!optIn) {
      const ok = await notifier.requestPermission();
      if (!ok) return;
    }
    const next = !optIn;
    setOptIn(next);
    await setOptedIn(next);
  };

  return (
    <div className="container-app">
      <Seo title={`${t('about.title')} – ${t('app.title')}`} description={t('about.dataBody')} path="/about" />
      <h1 className="mt-4 text-xl font-bold text-slate-900">{t('about.title')}</h1>

      {/* Data source */}
      <section className="card mt-4 p-4">
        <h2 className="text-sm font-semibold text-slate-800">{t('about.dataHeading')}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">{t('about.dataBody')}</p>
        {core && (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="text-slate-400">{t('about.datasetVersion')}</dt>
              <dd className="font-semibold text-slate-700">{core.metadata.datasetVersion}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-2">
              <dt className="text-slate-400">{t('about.updated')}</dt>
              <dd className="font-semibold text-slate-700">{formatHumanDate(core.metadata.generatedAt)}</dd>
            </div>
          </dl>
        )}
        <a
          href="https://npublic.msrtcors.com/"
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-block text-sm font-medium text-st-700 underline"
        >
          Official MSRTC booking portal ↗
        </a>
      </section>

      {/* Notifications (opt-in) */}
      {supported && (
        <section className="card mt-3 flex items-center justify-between p-4">
          <div className="pr-3">
            <h2 className="text-sm font-semibold text-slate-800">Route change alerts</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Get an opt-in alert when a saved route's timetable changes. No account, no Firebase.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={optIn}
            onClick={toggleNotifications}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${optIn ? 'bg-st-600' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute top-0.5 grid h-6 w-6 place-items-center rounded-full bg-white shadow transition-all ${
                optIn ? 'left-[22px]' : 'left-0.5'
              }`}
            >
              {optIn && <CheckIcon width={14} height={14} className="text-st-600" />}
            </span>
          </button>
        </section>
      )}

      <div className="mt-3 flex justify-center">
        <InstallButton />
      </div>

      {/* Disclaimer */}
      <section className="card mt-3 border-amber-200 bg-amber-50 p-4">
        <p className="text-xs leading-relaxed text-amber-900">{t('disclaimer.full')}</p>
      </section>

      <section className="card mt-3 p-4">
        <h2 className="text-sm font-bold text-slate-900">Data & photo credits</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Timings are transcribed from the 31 division timetables published by MSRTC on{' '}
          <a className="underline" href="https://msrtc.maharashtra.gov.in/GeneralPages/Timetabel.aspx" target="_blank" rel="noopener noreferrer">msrtc.maharashtra.gov.in</a>.
          District and taluka lists follow the Government of Maharashtra.
        </p>
        <ul className="mt-2 space-y-1 text-xs text-slate-600">
          {Object.entries(BUS_PHOTOS).map(([id, p]) => (
            <li key={id}>
              <a className="underline" href={p.source} target="_blank" rel="noopener noreferrer">{id}</a> — {p.author}, {p.license}, via Wikimedia Commons (resized)
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-4 text-center text-[11px] text-slate-400">
        Built with React · Vite · Tailwind · PWA · IndexedDB — backend-free & database-free.
      </p>
    </div>
  );
}
