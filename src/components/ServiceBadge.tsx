import type { ServiceType, ServiceCategory } from '@/types/domain';
import { localName, useI18n } from '@/i18n/I18nContext';

export type SvcRole =
  | 'Ordinary'
  | 'Semi'
  | 'Hirkani'
  | 'Shivshahi'
  | 'Shivneri'
  | 'AcSleep'
  | 'Sleeper'
  | 'Electric'
  | 'Midi';

const CATEGORY_ROLE: Record<ServiceCategory, SvcRole> = {
  ordinary:     'Ordinary',
  'semi-luxury':'Hirkani',
  ac:           'Shivshahi',
  'premium-ac': 'Shivneri',
  sleeper:      'Sleeper',
  electric:     'Electric',
  midi:         'Midi',
  city:         'Ordinary',
};

const ID_ROLE: Record<string, SvcRole> = {
  express: 'Semi',
  parivartan: 'Semi',
  ashwamedh: 'AcSleep',
};

function idAliasRole(service: ServiceType): SvcRole {
  const key = service.id.toLowerCase();
  if (ID_ROLE[key]) return ID_ROLE[key];
  const aliases = (service.aliases ?? []).join(' | ').toLowerCase();
  if (aliases.includes('aasani')) return 'AcSleep';
  return CATEGORY_ROLE[service.category] ?? 'Ordinary';
}

export function serviceRole(service: ServiceType): SvcRole {
  return idAliasRole(service);
}

export function categoryStyle(cat: ServiceCategory): string {
  const role = CATEGORY_ROLE[cat] ?? 'Ordinary';
  return roleStyle(role);
}

export function roleStyle(role: SvcRole): string {
  switch (role) {
    case 'Ordinary':  return 'bg-red-50 text-red-800 ring-1 ring-red-200/70';
    case 'Semi':      return 'bg-orange-50 text-orange-800 ring-1 ring-orange-200/70';
    case 'Hirkani':   return 'bg-pink-50 text-pink-800 ring-1 ring-pink-200/70';
    case 'Shivshahi': return 'bg-violet-50 text-violet-800 ring-1 ring-violet-200/70';
    case 'Shivneri':  return 'bg-blue-50 text-blue-800 ring-1 ring-blue-200/70';
    case 'AcSleep':   return 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200/70';
    case 'Sleeper':   return 'bg-teal-50 text-teal-800 ring-1 ring-teal-200/70';
    case 'Electric':  return 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70';
    case 'Midi':      return 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70';
  }
}

export function ServiceBadge({ service }: { service: ServiceType }) {
  const { lang } = useI18n();
  return (
    <span className={`chip ${roleStyle(serviceRole(service))}`}>
      {service.ac && <span aria-hidden className="text-[10px]">❄</span>}
      {localName(lang, service)}
    </span>
  );
}
