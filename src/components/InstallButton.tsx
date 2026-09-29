import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useI18n } from '@/i18n/I18nContext';
import { InstallIcon } from './Icons';

export function InstallButton({ className = '' }: { className?: string }) {
  const { canInstall, promptInstall } = usePwaInstall();
  const { t } = useI18n();
  if (!canInstall) return null;
  return (
    <button type="button" onClick={promptInstall} className={`btn-ghost ${className}`}>
      <InstallIcon width={16} height={16} aria-hidden />
      {t('install.button')}
    </button>
  );
}
