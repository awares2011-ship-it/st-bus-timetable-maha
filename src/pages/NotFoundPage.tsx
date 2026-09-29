import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { EmptyState } from '@/components/ui';
import { BusIcon } from '@/components/Icons';

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="container-app mt-8">
      <Seo title="Not found" description="Page not found" noindex />
      <EmptyState icon={<BusIcon width={30} height={30} />} title="404" hint="This page doesn't exist.">
        <Link to="/" className="btn-primary mt-2">
          {t('nav.home')}
        </Link>
      </EmptyState>
    </div>
  );
}
