import { Link } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { EmptyState, SectionTitle } from '@/components/ui';
import { FavoriteButton } from '@/components/FavoriteButton';
import { ArrowRightIcon, ChevronRightIcon, StarIcon, PinIcon } from '@/components/Icons';
import { useFavorites } from '@/hooks/useFavorites';
import { routePairSlug } from '@/utils/text';
import type { FavoriteRoute, FavoriteStation } from '@/services/db';

export function FavoritesPage() {
  const { t } = useI18n();
  const { status } = useData();
  const { favorites, loaded, toggleRoute, toggleStation } = useFavorites();

  const routes = favorites.filter((f): f is FavoriteRoute => f.kind === 'route');
  const stations = favorites.filter((f): f is FavoriteStation => f.kind === 'station');

  return (
    <div className="container-app">
      <Seo title={`${t('favorites.title')} – ${t('app.title')}`} description={t('favorites.empty')} path="/favorites" noindex />
      <h1 className="mt-4 text-xl font-bold text-slate-900">{t('favorites.title')}</h1>

      {loaded && status === 'ready' && favorites.length === 0 && (
        <div className="mt-4">
          <EmptyState icon={<StarIcon width={28} height={28} />} title={t('favorites.title')} hint={t('favorites.empty')} />
        </div>
      )}

      {routes.length > 0 && (
        <>
          <SectionTitle>{t('favorites.routes')}</SectionTitle>
          <div className="grid gap-2">
            {routes.map((f) => (
              <div key={f.id} className="card flex items-center justify-between py-2 pl-4 pr-1">
                <Link to={`/st-bus/${routePairSlug(f.from, f.to)}`} className="flex flex-1 items-center gap-2 font-medium text-slate-800">
                  {f.fromName} <ArrowRightIcon width={16} height={16} className="text-st-400" /> {f.toName}
                </Link>
                <FavoriteButton active label={t('common.remove')} onToggle={() => toggleRoute(f)} />
              </div>
            ))}
          </div>
        </>
      )}

      {stations.length > 0 && (
        <>
          <SectionTitle>{t('favorites.stations')}</SectionTitle>
          <div className="grid gap-2">
            {stations.map((f) => (
              <div key={f.id} className="card flex items-center justify-between py-2 pl-4 pr-1">
                <Link to={`/station/${f.stationId}`} className="flex flex-1 items-center gap-2 font-medium text-slate-800">
                  <PinIcon width={16} height={16} className="text-st-400" /> {f.name}
                </Link>
                <FavoriteButton active label={t('common.remove')} onToggle={() => toggleStation(f)} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
