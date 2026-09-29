import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import type { Division } from '@/types/domain';
import { useI18n } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { Spinner, EmptyState } from '@/components/ui';
import { ChevronRightIcon, SearchIcon } from '@/components/Icons';
import { normalizeKey as normalizeForSearch } from '@/utils/text';

/** Route counts per stop id: [departing routes, arriving routes]. */
function useRouteCounts() {
  const { core } = useData();
  return useMemo(() => {
    const m = new Map<string, [number, number]>();
    for (const r of core?.routes ?? []) {
      const a = m.get(r.from) ?? [0, 0];
      a[0]++;
      m.set(r.from, a);
      const b = m.get(r.to) ?? [0, 0];
      b[1]++;
      m.set(r.to, b);
    }
    return m;
  }, [core?.routes]);
}

/** /districts — all 36 districts grouped by MSRTC region → division. */
export function DistrictsPage() {
  const { core, status } = useData();
  const { lang } = useI18n();
  const [q, setQ] = useState('');
  const counts = useRouteCounts();

  const groups = useMemo(() => {
    const byRegion = new Map<string, { name: string; nameMr: string; divisions: Division[] }>();
    for (const d of core?.divisions ?? []) {
      const key = d.region ?? 'other';
      if (!byRegion.has(key)) byRegion.set(key, { name: d.regionName ?? key, nameMr: d.regionNameMr ?? key, divisions: [] });
      byRegion.get(key)!.divisions.push(d);
    }
    return [...byRegion.values()];
  }, [core?.divisions]);

  const districtById = useMemo(() => new Map((core?.districts ?? []).map((d) => [d.id, d])), [core?.districts]);

  const needle = normalizeForSearch(q);
  const talukaHits = useMemo(() => {
    if (!needle) return [];
    const out: { district: string; districtMr: string; districtId: string; name: string; nameMr: string; stop: string }[] = [];
    for (const d of core?.districts ?? []) {
      for (const t of d.talukas) {
        const hay = normalizeForSearch(`${t.name} ${t.nameMr} ${t.hq} ${t.hqMr} ${d.name} ${d.nameMr}`);
        if (hay.includes(needle)) out.push({ district: d.name, districtMr: d.nameMr, districtId: d.id, name: t.name, nameMr: t.nameMr, stop: t.stop });
      }
    }
    return out.slice(0, 40);
  }, [needle, core?.districts]);

  if (status === 'loading') return <Spinner />;
  const talukaTotal = (core?.districts ?? []).reduce((n, d) => n + d.talukas.length, 0);

  return (
    <div className="container-app pb-8">
      <Seo
        title="Maharashtra ST Bus Timetable by District & Taluka | जिल्हा व तालुका निहाय एसटी वेळापत्रक"
        description="Browse MSRTC ST bus timings for all 36 districts and 358 talukas of Maharashtra — district-wise and taluka-wise bus stands."
        path="/districts"
      />
      <h1 className="mt-5 text-xl font-bold text-slate-900">{lang === 'mr' ? 'जिल्हा व तालुका' : 'Districts & talukas'}</h1>
      <p className="muted text-sm">
        {core?.districts.length ?? 0} {lang === 'mr' ? 'जिल्हे' : 'districts'} · {talukaTotal} {lang === 'mr' ? 'तालुके' : 'talukas'} · {core?.divisions.length ?? 0} {lang === 'mr' ? 'एसटी विभाग' : 'MSRTC divisions'}
      </p>

      <div className="relative mt-4">
        <SearchIcon width={16} height={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="field pl-10"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={lang === 'mr' ? 'तालुका किंवा जिल्हा शोधा… (उदा. जुन्नर, Wai)' : 'Find a taluka or district… (e.g. Junnar, वाई)'}
          autoComplete="off"
        />
      </div>

      {needle ? (
        <section className="mt-4 space-y-2">
          {talukaHits.length === 0 && <EmptyState title={lang === 'mr' ? 'काहीही सापडले नाही' : 'No match'} />}
          {talukaHits.map((h) => (
            <Link key={`${h.districtId}-${h.name}`} to={`/station/${h.stop}`} className="tile justify-between">
              <span>
                <span className="block font-semibold text-slate-900">{lang === 'mr' ? h.nameMr : h.name}</span>
                <span className="muted block text-xs">
                  {lang === 'mr' ? `तालुका · ${h.districtMr} जिल्हा` : `Taluka · ${h.district} district`}
                </span>
              </span>
              <ChevronRightIcon width={16} height={16} className="text-slate-300" />
            </Link>
          ))}
        </section>
      ) : (
        groups.map((g) => (
          <section key={g.name} className={`mt-6 region-${g.divisions[0]?.region ?? 'pune'}`}>
            <h2 className="rc-text mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <span className="rc-dot h-2.5 w-2.5 rounded-full" />
              {lang === 'mr' ? `${g.nameMr} प्रदेश` : `${g.name} region`}
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {g.divisions.flatMap((dv) =>
                (dv.districts ?? []).map((did) => {
                  const d = districtById.get(did);
                  if (!d) return null;
                  const served = d.talukas.filter((t) => (counts.get(t.stop)?.[0] ?? 0) + (counts.get(t.stop)?.[1] ?? 0) > 0).length;
                  return (
                    <Link key={d.id} to={`/district/${d.id}`} className="tile rc-tile justify-between">
                      <span>
                        <span className="block font-semibold text-slate-900">{lang === 'mr' ? d.nameMr : d.name}</span>
                        <span className="muted block text-xs">
                          {d.talukas.length} {lang === 'mr' ? 'तालुके' : 'talukas'} · {served} {lang === 'mr' ? 'सह बस वेळा' : 'with bus times'}
                        </span>
                      </span>
                      <ChevronRightIcon width={16} height={16} className="text-slate-300" />
                    </Link>
                  );
                }),
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

/** /district/:id — every taluka of one district, linking to its bus stand. */
export function DistrictPage() {
  const { id = '' } = useParams();
  const { core, status, divisionById, stopById } = useData();
  const { lang } = useI18n();
  const counts = useRouteCounts();

  if (status === 'loading') return <Spinner />;
  const d = core?.districts.find((x) => x.id === id);
  if (!d) {
    return (
      <div className="container-app mt-6">
        <EmptyState title="District not found">
          <Link to="/districts" className="btn-primary mt-2">← Districts</Link>
        </EmptyState>
      </div>
    );
  }
  const division = divisionById.get(d.division);

  return (
    <div className={`container-app pb-8 region-${division?.region ?? 'pune'}`}>
      <Seo
        title={`${d.name} District ST Bus Timetable – all talukas | ${d.nameMr} जिल्हा एसटी बस वेळापत्रक`}
        description={`MSRTC ST bus timings for every taluka of ${d.name} district (${d.nameMr}) — ${d.talukas.map((t) => t.name).join(', ')}.`}
        path={`/district/${d.id}`}
      />
      <Link to="/districts" className="link-accent mt-4 inline-block">← {lang === 'mr' ? 'सर्व जिल्हे' : 'All districts'}</Link>
      <h1 className="rc-text mt-2 text-xl font-bold">
        {lang === 'mr' ? `${d.nameMr} जिल्हा` : `${d.name} district`}
      </h1>
      <p className="muted text-sm">
        {lang === 'mr' ? 'एसटी विभाग' : 'MSRTC division'}: {division ? (lang === 'mr' ? division.nameMr : division.name) : d.division}
        {' · '}{d.talukas.length} {lang === 'mr' ? 'तालुके' : 'talukas'}
      </p>

      <div className="mt-4 grid gap-2">
        {d.talukas.map((t) => {
          const [dep, arr] = counts.get(t.stop) ?? [0, 0];
          const stop = stopById.get(t.stop);
          return (
            <Link key={t.name} to={`/station/${t.stop}`} className="tile rc-tile justify-between">
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900">
                  {lang === 'mr' ? t.nameMr : t.name}
                  {t.hq !== t.name && (
                    <span className="muted font-normal"> · {lang === 'mr' ? t.hqMr : t.hq}</span>
                  )}
                </span>
                <span className="muted block text-xs">
                  {dep > 0
                    ? `${dep} ${lang === 'mr' ? 'मार्ग सुटतात' : 'routes depart'}`
                    : arr > 0
                      ? `${arr} ${lang === 'mr' ? 'मार्गांवरून बस येतात' : 'routes arrive here'}`
                      : lang === 'mr' ? 'वेळापत्रक लवकरच' : 'Timings coming soon'}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {dep + arr > 0 && (
                  <span className="chip rc-chip">
                    {dep + arr}
                  </span>
                )}
                <ChevronRightIcon width={16} height={16} className="text-slate-300" />
              </span>
              {!stop && null}
            </Link>
          );
        })}
      </div>

      {division?.timetablePdf && (
        <a href={division.timetablePdf} target="_blank" rel="noopener noreferrer" className="btn-ghost mt-5 w-full text-sm">
          {lang === 'mr' ? 'अधिकृत एसटी विभाग वेळापत्रक (PDF)' : 'Official MSRTC division timetable (PDF)'} ↗
        </a>
      )}
    </div>
  );
}
