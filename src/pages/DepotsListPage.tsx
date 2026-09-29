import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { Spinner, SectionTitle } from '@/components/ui';
import { SearchIcon, ChevronRightIcon } from '@/components/Icons';
import { ListNativeAd } from '@/components/NativeAd';

// Major depots to highlight at top
const FEATURED_DEPOT_IDS = [
  'swargate', 'shivajinagar', 'pune-station', 'mumbai-busstand',
  'nashik-cbs', 'nashik-mela', 'panvel', 'lonavala', 'kolhapur',
  'satara', 'sangli', 'solapur', 'sambhajinagar', 'nagpur',
  'thane', 'manmad', 'malegaon', 'satana', 'shirdi',
];

export function DepotsListPage() {
  const { core, divisionById, status } = useData();
  const { t, lang } = useI18n();
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState<string>('all');

  const depots = useMemo(() => core?.depots ?? [], [core]);
  const districts = useMemo(()=>{
    const s=new Set<string>();
    core?.stops.forEach(st=> { if(st.district) s.add(st.district); });
    return ['all', ...Array.from(s).sort()];
  },[core]);

  const filtered = useMemo(() => {
    let list=depots;
    if(districtFilter!=='all'){
      // filter depots whose division has stops in that district
      const depotsInDistrict=new Set<string>();
      core?.stops.filter(s=> s.district===districtFilter && s.depot).forEach(s=> depotsInDistrict.add(s.depot!));
      // also match division name
      list=list.filter(d=> depotsInDistrict.has(d.id) || d.name.includes(districtFilter) || d.nameMr.includes(districtFilter));
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(d =>
      d.name.toLowerCase().includes(q) ||
      d.nameMr.includes(q),
    );
  }, [depots, search, districtFilter, core]);

  // Group by division
  const grouped = useMemo(() => {
    const map = new Map<string, typeof depots>();
    for (const d of filtered) {
      const div = d.division;
      if (!map.has(div)) map.set(div, []);
      map.get(div)!.push(d);
    }
    return map;
  }, [filtered]);

  const featured = useMemo(
    () => depots.filter(d => FEATURED_DEPOT_IDS.includes(d.id)),
    [depots],
  );

  if (status === 'loading') return <Spinner label={t('common.loading')} />;

  return (
    <div className="container-app pb-6">
      <Seo
        title="All MSRTC Depots — Maharashtra ST Bus Timetable | सर्व डेपो"
        description="Browse all Maharashtra MSRTC bus depot timetables. Find departure times for buses from any depot across Maharashtra."
        path="/depots"
      />

      {/* Header */}
      <div className="mt-4 card px-5 py-6 text-slate-900">
        <h1 className="text-xl font-extrabold">सर्व बस डेपो वेळापत्रक</h1>
        <p className="mt-1 text-sm text-slate-500">All Maharashtra MSRTC Bus Depots</p>
        <p className="mt-2 text-xs text-slate-500">{depots.length} डेपो उपलब्ध</p>
      </div>

      {/* Search */}
      <div className="mt-4 relative">
        <SearchIcon width={16} height={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="डेपो शोधा... (e.g. Pune, Nashik, मुंबई)"
          className="field pl-10 text-sm"
        />
      </div>
      {/* District filter chips */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1" style={{scrollbarWidth:'none'}}>
        {districts.slice(0,12).map(d=>(
          <button key={d} onClick={()=>setDistrictFilter(d)} className={`whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold border ${districtFilter===d?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-600 border-slate-200'}`}>{d==='all'?'सर्व जिल्हे':d}</button>
        ))}
      </div>

      {/* Featured depots */}
      {!search && (
        <section>
          <SectionTitle>प्रमुख बस स्थानके</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {featured.map(depot => {
              const div = divisionById.get(depot.division);
              return (
                <Link
                  key={depot.id}
                  to={`/depot/${depot.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-st-300 hover:shadow-md transition-all active:scale-[.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-slate-900 leading-snug">
                        {lang === 'mr' ? depot.nameMr : depot.name}
                      </p>
                      {lang === 'en' && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{depot.nameMr}</p>
                      )}
                      {div && (
                        <span className="mt-1.5 inline-block rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-st-600">
                          {lang === 'mr' ? div.nameMr : div.name}
                        </span>
                      )}
                    </div>
                    <ChevronRightIcon width={14} height={14} className="text-slate-300 mt-0.5 flex-shrink-0" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* All depots by division */}
      {search ? (
        <section>
          <SectionTitle>{filtered.length} डेपो सापडले</SectionTitle>
          <DepotList depots={filtered} divisionById={divisionById} lang={lang} />
        </section>
      ) : (
        Array.from(grouped.entries()).map(([divId, divDepots]) => {
          const div = divisionById.get(divId);
          const divName = div ? (lang === 'mr' ? div.nameMr : div.name) : divId;
          return (
            <section key={divId}>
              <SectionTitle>{divName} विभाग</SectionTitle>
              <DepotList depots={divDepots} divisionById={divisionById} lang={lang} />
            </section>
          );
        })
      )}
    </div>
  );
}

function DepotList({
  depots,
  divisionById,
  lang,
}: {
  depots: Array<{ id: string; name: string; nameMr: string; division: string }>;
  divisionById: Map<string, { name: string; nameMr: string; nameHi: string; id: string; slug: string }>;
  lang: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {depots.map((depot, i) => {
        const div = divisionById.get(depot.division);
        
        // Insert native ad after every 5th depot
        const showAd = (i + 1) % 5 === 0 && i < depots.length - 1;
        
        return (
          <div key={depot.id}>
            <Link
              to={`/depot/${depot.id}`}
              className={`flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors ${
                i < depots.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <div>
                <p className="font-semibold text-sm text-slate-900">
                  {lang === 'mr' ? depot.nameMr : depot.name}
                </p>
                {lang === 'en' && depot.nameMr !== depot.name && (
                  <p className="text-xs text-slate-400">{depot.nameMr}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {div && (
                  <span className="text-xs text-slate-400">{lang === 'mr' ? div.nameMr : div.name}</span>
                )}
                <ChevronRightIcon width={14} height={14} className="text-slate-300" />
              </div>
            </Link>
            {showAd && (
              <div className="border-b border-slate-100 px-2 py-2">
                <ListNativeAd />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
