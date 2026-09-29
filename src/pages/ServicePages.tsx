import { useEffect, useMemo, useState } from 'react';
import { BusImage, PhotoCreditLine, busPhoto } from '@/components/BusPhoto';
import { Link, useParams } from 'react-router-dom';
import type { Trip } from '@/types/domain';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { Spinner, EmptyState, SectionTitle } from '@/components/ui';
import { ChevronRightIcon, ArrowRightIcon } from '@/components/Icons';
import { loadSchedules } from '@/services/data';
import { routePairSlug } from '@/utils/text';

export function ServicesIndexPage() {
  const { core, status } = useData();
  const { t, lang } = useI18n();
  if (status === 'loading') return <Spinner label={t('common.loading')} />;
  const services = [...(core?.serviceTypes ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="container-app">
      <Seo
        title={`${t('service.allTypes')} – MSRTC | एसटी बसचे प्रकार`}
        description={t('service.intro')}
        path="/bus"
      />
      <h1 className="mt-4 text-xl font-bold text-slate-900">{t('service.allTypes')}</h1>
      <p className="mt-1 text-sm text-slate-500">{t('service.intro')}</p>

      <div className="mt-4 grid gap-3">
        {services.map((s) => (
          <Link key={s.id} to={`/bus/${s.id}`} className="card flex items-center gap-3 p-3 hover:ring-st-200">
            <BusImage serviceId={s.id} fallback={s.image} alt="" className="h-10 w-[72px] shrink-0 rounded-md" />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-slate-800">{localName(lang, s)}</span>
              <span className="block truncate text-xs text-slate-500">
                {s.ac ? t('service.ac') : t('service.nonAc')}
              </span>
            </span>
            <ChevronRightIcon width={18} height={18} className="text-slate-300" />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ServicePage() {
  const { id = '' } = useParams();
  const { core, serviceById, stopById, status } = useData();
  const { t, lang } = useI18n();
  const [trips, setTrips] = useState<Trip[]>([]);

  const service = serviceById.get(id);
  const slugs = useMemo(() => (core?.metadata.schedules ?? []).map((s) => s.slug), [core]);

  useEffect(() => {
    if (slugs.length) void loadSchedules(slugs).then(setTrips).catch(() => setTrips([]));
  }, [slugs]);

  const routeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tp of trips) if (tp.serviceType === id) ids.add(tp.routeId);
    return ids;
  }, [trips, id]);

  const routes = useMemo(
    () => (core?.routes ?? []).filter((r) => routeIds.has(r.id)),
    [core?.routes, routeIds],
  );

  if (status === 'loading') return <Spinner label={t('common.loading')} />;
  if (!service) {
    return (
      <div className="container-app mt-6">
        <EmptyState title={t('results.none')}>
          <Link to="/bus" className="btn-primary mt-2">{t('nav.services')}</Link>
        </EmptyState>
      </div>
    );
  }

  const desc = lang === 'mr' ? service.descriptionMr : lang === 'hi' ? service.descriptionHi : service.description;

  return (
    <div className="container-app">
      <Seo
        title={`MSRTC ${service.name} Bus – Timetable, Routes & Info | ${service.nameMr}`}
        description={`${service.name} (${service.nameMr}): ${service.description}`}
        path={`/bus/${service.id}`}
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: `MSRTC ${service.name}`,
          description: service.description,
          category: 'Bus service',
        }}
      />

      <div className="card mt-4 overflow-hidden">
        <BusImage serviceId={service.id} fallback={service.image} alt={`MSRTC ${service.name} bus`} className="h-52 w-full" />
        {busPhoto(service.id) && <PhotoCreditLine credit={busPhoto(service.id)!} className="px-4 pt-1" />}
        <div className="p-4">
          <h1 className="text-xl font-bold text-slate-900">MSRTC {localName(lang, service)}</h1>
          <span className={`chip mt-1 ring-1 ${service.ac ? 'bg-violet-50 text-violet-700 ring-violet-200' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
            {service.ac ? t('service.ac') : t('service.nonAc')}
          </span>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{desc}</p>
        </div>
      </div>

      <SectionTitle>{t('service.availableOn')}</SectionTitle>
      {routes.length === 0 ? (
        <EmptyState title={t('station.noRoutes')} />
      ) : (
        <div className="grid gap-2">
          {routes.map((r) => {
            const a = stopById.get(r.from);
            const b = stopById.get(r.to);
            if (!a || !b) return null;
            return (
              <Link key={r.id} to={`/st-bus/${routePairSlug(r.from, r.to)}`} className="card flex items-center justify-between px-4 py-3 hover:ring-st-200">
                <span className="flex items-center gap-2 font-medium text-slate-800">
                  {localName(lang, a)} <ArrowRightIcon width={16} height={16} className="text-st-400" /> {localName(lang, b)}
                </span>
                <ChevronRightIcon width={18} height={18} className="text-slate-300" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
