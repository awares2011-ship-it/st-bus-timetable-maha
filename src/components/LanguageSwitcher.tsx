import { useI18n, LANGS, type Lang } from '@/i18n/I18nContext';
import { GlobeIcon } from './Icons';

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <label className="inline-flex h-9 items-center gap-1 rounded-full bg-white/20 px-2 text-sm text-white">
      <GlobeIcon width={16} height={16} aria-hidden className="hidden min-[400px]:block" />
      <span className="sr-only">{t('common.language')}</span>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as Lang)}
        className="max-w-[4.5rem] bg-transparent font-semibold text-white outline-none [&>option]:text-slate-900"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
