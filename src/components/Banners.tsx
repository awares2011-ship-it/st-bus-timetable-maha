import { useI18n } from '@/i18n/I18nContext';
import { useData } from '@/context/DataContext';
import { WifiOffIcon, InfoIcon } from './Icons';

/** Shown when the browser is offline (data comes from the local cache). */
export function OfflineBanner() {
  const { online, status } = useData();
  const { t } = useI18n();
  if (online || status !== 'ready') return null;
  return (
    <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 text-center text-xs font-medium text-white">
      <WifiOffIcon width={16} height={16} aria-hidden />
      <span className="flex-1">{t('offline.banner')}</span>
    </div>
  );
}

/** Shown whenever the active dataset contains unverified/demo trips. */
export function DemoBanner() {
  const { core } = useData();
  const { t } = useI18n();
  if (!core?.metadata.containsDemoData) return null;
  return (
    <div className="container-app mt-3">
      <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
        <InfoIcon width={16} height={16} aria-hidden className="mt-0.5 shrink-0" />
        <span>{t('demo.banner')}</span>
      </div>
    </div>
  );
}

export function DisclaimerFooter() {
  const { lang } = useI18n();
  const disclaimerText = {
    mr: 'ही स्वतंत्र सेवा आहे — MSRTC शी संलग्न नाही. वेळापत्रक बदलू शकते. प्रवासापूर्वी अधिकृत स्रोतावर खात्री करा.',
    en: 'This is an independent service — Not affiliated with MSRTC. Timetables may change. Please confirm with official sources before travel.',
    hi: 'यह एक स्वतंत्र सेवा है — MSRTC से संबद्ध नहीं है। समय सारणी बदल सकती है। यात्रा से पहले आधिकारिक स्रोतों से पुष्टि करें।'
  };
  
  return (
    <div className="safe-b pb-16">
      <p className="mx-auto max-w-2xl px-4 py-3 text-center text-[10px] leading-relaxed text-slate-400">
        {disclaimerText[lang] || disclaimerText.en}
      </p>
    </div>
  );
}
