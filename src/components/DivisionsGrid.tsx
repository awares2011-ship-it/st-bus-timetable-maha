import { Link } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { useI18n } from '@/i18n/I18nContext';

const DIVISIONS_ACCENT: Record<string, { fill: string; bar: string; icon: string; gradFrom: string; gradTo: string }> = {
  pune:          { fill: 'bg-red-50',      bar: 'bg-red-600',      icon: '🏙️', gradFrom: '#fecaca', gradTo: '#fee2e2' },
  mumbai:        { fill: 'bg-sky-50',      bar: 'bg-sky-600',      icon: '🌆', gradFrom: '#bae6fd', gradTo: '#e0f2fe' },
  thane:         { fill: 'bg-cyan-50',     bar: 'bg-cyan-600',     icon: '🚉', gradFrom: '#a5f3fc', gradTo: '#ecfeff' },
  nashik:        { fill: 'bg-emerald-50',  bar: 'bg-emerald-600',  icon: '🍇', gradFrom: '#a7f3d0', gradTo: '#ecfdf5' },
  nagpur:        { fill: 'bg-orange-50',   bar: 'bg-orange-600',   icon: '🍊', gradFrom: '#fed7aa', gradTo: '#fff7ed' },
  amravati:      { fill: 'bg-amber-50',    bar: 'bg-amber-600',    icon: '🌾', gradFrom: '#fcd34d', gradTo: '#fffbeb' },
  kolhapur:      { fill: 'bg-violet-50',   bar: 'bg-violet-600',   icon: '🥇', gradFrom: '#c4b5fd', gradTo: '#f5f3ff' },
  satara:        { fill: 'bg-pink-50',     bar: 'bg-pink-600',     icon: '⛰️', gradFrom: '#f9a8d4', gradTo: '#fdf2f8' },
  sangli:        { fill: 'bg-rose-50',     bar: 'bg-rose-600',     icon: '🌰', gradFrom: '#fda4af', gradTo: '#fff1f2' },
  solapur:       { fill: 'bg-yellow-50',   bar: 'bg-yellow-600',   icon: '☀️', gradFrom: '#fde047', gradTo: '#fefce8' },
  ahilyanagar:   { fill: 'bg-lime-50',     bar: 'bg-lime-600',     icon: '🌱', gradFrom: '#bef264', gradTo: '#f7fee7' },
  sambhajinagar: { fill: 'bg-purple-50',   bar: 'bg-purple-600',   icon: '🕌', gradFrom: '#d8b4fe', gradTo: '#faf5ff' },
  ratnagiri:     { fill: 'bg-teal-50',     bar: 'bg-teal-600',     icon: '🌊', gradFrom: '#5eead4', gradTo: '#f0fdfa' },
};

const PDF_VERIFIED = new Set(['pune', 'mumbai', 'nashik', 'nagpur', 'sambhajinagar', 'amravati']);

export function DivisionsGrid() {
  const { core } = useData();
  const { lang } = useI18n();
  const divisions = core?.divisions ?? [];
  if (divisions.length === 0) return null;

  const tripCountByDivision = new Map<string, number>();
  for (const s of core?.metadata.schedules ?? []) tripCountByDivision.set(s.division, s.trips);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {divisions.map((d) => {
        const accent = DIVISIONS_ACCENT[d.id] ?? { fill: 'bg-slate-50', bar: 'bg-slate-500', icon: '📍', gradFrom: '#e2e8f0', gradTo: '#f8fafc' };
        const trips = tripCountByDivision.get(d.id) ?? 0;
        const verified = PDF_VERIFIED.has(d.id);
        return (
          <Link
            key={d.id}
            to={`/depots?division=${d.slug}`}
            className="card-hover relative overflow-hidden p-0 group"
            aria-label={`${d.name} division`}
          >
            {/* Colored gradient background */}
            <div className="px-3.5 py-3.5 relative"
              style={{ background: `linear-gradient(135deg, ${accent.gradFrom}40, ${accent.gradTo})` }}>
              {/* Decorative circle */}
              <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-20"
                style={{ background: `linear-gradient(135deg, ${accent.gradFrom}, ${accent.gradTo})` }} aria-hidden />

              <div className="flex items-start justify-between relative">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    विभाग / Division
                  </p>
                  <p className="text-sm font-bold text-slate-900 leading-tight mt-0.5">
                    {lang === 'mr' ? d.nameMr : d.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                    {trips > 0 ? `${trips.toLocaleString('en-IN')} बस/day` : 'नवीन डेटा येत आहे'}
                  </p>
                </div>
                <span className="text-2xl leading-none drop-shadow-sm group-hover:scale-110 transition-transform duration-200">{accent.icon}</span>
              </div>
              {verified && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm shadow-emerald-500/25">
                  ✓ 2025 verified
                </span>
              )}
            </div>
            {/* Colorful bottom bar */}
            <div className={`h-1.5 w-full ${accent.bar} group-hover:h-2 transition-all duration-200`} aria-hidden />
          </Link>
        );
      })}
    </div>
  );
}

export function ServiceLegend() {
  const items: { label: string; en: string; color: string; gradFrom: string; gradTo: string }[] = [
    { label: 'साधी',           en: 'Ordinary',   color: 'bg-red-600',    gradFrom: '#dc2626', gradTo: '#ea580c' },
    { label: 'हिरकणी',         en: 'Hirkani',    color: 'bg-pink-600',   gradFrom: '#db2777', gradTo: '#e11d48' },
    { label: 'शिवशाही',        en: 'Shivshahi',  color: 'bg-orange-500', gradFrom: '#7c3aed', gradTo: '#6366f1' },
    { label: 'निमआराम',        en: 'Semi',       color: 'bg-emerald-600',gradFrom: '#ea580c', gradTo: '#d97706' },
    { label: 'शिवनेरी',        en: 'Shivneri',   color: 'bg-blue-600',   gradFrom: '#1d4ed8', gradTo: '#4338ca' },
  ];
  return (
    <div className="rounded-2xl bg-white p-3.5 ring-1 ring-slate-200/60 shadow-sm">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        बसच्या रंगांचा अर्थ / Bus livery legend
      </p>
      <div className="flex flex-wrap gap-2.5">
        {items.map((i) => (
          <div key={i.en} className="flex items-center gap-2 group">
            <span className="h-4 w-7 rounded-md shadow-sm group-hover:scale-110 transition-transform duration-200"
              style={{ background: `linear-gradient(135deg, ${i.gradFrom}, ${i.gradTo})` }} aria-hidden />
            <span className="text-xs">
              <span className="font-bold text-slate-800">{i.label}</span>
              <span className="ml-1 text-slate-400 font-medium">{i.en}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
