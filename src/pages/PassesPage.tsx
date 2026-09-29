import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { SCHEMES, CATEGORIES, TONES, OFFICIAL_LINKS, type Category, type Scheme } from '@/data/schemes';
import { useSmartAlerts, saveProfile, saveMyPass, PASS_KINDS, localISO, type PassKind } from '@/services/smartAlerts';

function SchemeCard({ s, mine }: { s: Scheme; mine: boolean }) {
  const { lang } = useI18n();
  const mr = lang === 'mr';
  const tone = TONES[s.tone];
  return (
    <article id={s.id} className="card scroll-mt-20 overflow-hidden" style={{ borderTop: `5px solid ${tone.color}` }}>
      <div className="flex items-start gap-3 p-4" style={{ background: `linear-gradient(135deg, ${tone.soft}, #fff 70%)` }}>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-2xl" style={{ background: '#fff', boxShadow: `0 0 0 2px ${tone.color}33` }}>{s.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-extrabold text-slate-900">{mr ? s.titleMr : s.titleEn}</h2>
            {mine && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: TONES.personal.color }}>{mr ? 'तुमच्यासाठी' : 'For you'}</span>}
          </div>
          <p className="text-xs text-slate-600">{mr ? s.whoMr : s.whoEn}</p>
        </div>
        <span className="shrink-0 rounded-xl px-2.5 py-1 text-sm font-extrabold text-white" style={{ background: tone.color }}>
          {mr ? s.benefitMr : s.benefitEn}
        </span>
      </div>
      <ul className="space-y-1.5 px-4 pb-3 pt-2 text-[13px] leading-relaxed text-slate-700">
        {(mr ? s.pointsMr : s.pointsEn).map((p) => (
          <li key={p} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tone.color }} />{p}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-x-3 gap-y-1 border-t px-4 py-2 text-[11px] text-slate-500" style={{ borderColor: 'var(--line)' }}>
        <span>{mr ? 'स्रोत:' : 'Sources:'}</span>
        {s.sources.map((src) => (
          <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-800">
            {src.label}{src.date !== 'official' ? ` (${src.date})` : ''}
          </a>
        ))}
      </div>
    </article>
  );
}

export function PassesPage() {
  const { lang } = useI18n();
  const mr = lang === 'mr';
  const { hash } = useLocation();
  const { profile, pass } = useSmartAlerts(lang);
  const [kind, setKind] = useState<PassKind>('monthly');
  const [expires, setExpires] = useState('');

  useEffect(() => { if (pass) { setKind(pass.kind); setExpires(pass.expires); } }, [pass]);
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }, [hash]);

  const cats = new Set(profile.categories);
  const toggleCat = (c: Category) => {
    const next = new Set(cats);
    if (next.has(c)) next.delete(c); else next.add(c);
    void saveProfile({ ...profile, categories: [...next] });
  };
  const mineIds = new Set(SCHEMES.filter((s) => s.for.some((c) => cats.has(c))).map((s) => s.id));
  const ordered = [...SCHEMES].sort((a, b) => Number(mineIds.has(b.id)) - Number(mineIds.has(a.id)));
  const needsNcmc = cats.has('woman') || cats.has('senior65') || cats.has('senior75');

  return (
    <div className="container-app pb-8">
      <Seo
        title={mr ? 'एसटी पास व सवलत योजना — महिला, ज्येष्ठ, विद्यार्थी' : 'MSRTC ST passes & concession schemes'}
        description="Mahila Sanman 50%, Amrut Jyeshtha free travel, student pass, Ahilyabai Holkar free pass, 4/7-day pass fares, e-bus pass, NCMC card."
        path="/passes"
      />

      <div className="mt-4 overflow-hidden rounded-2xl p-5 text-white" style={{ background: 'var(--mc-cool)' }}>
        <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">{mr ? 'एसटी महामंडळ' : 'MSRTC'}</p>
        <h1 className="text-2xl font-extrabold leading-tight">{mr ? 'पास व सवलत योजना' : 'Passes & concession schemes'}</h1>
        <p className="mt-1 text-sm text-white/90">{mr ? 'तुम्हाला कोणती सवलत मिळते ते निवडा — फक्त तुमच्यासाठीच्या सूचना मिळवा.' : 'Pick who you are — see only the concessions and alerts that apply to you.'}</p>
      </div>

      {/* Profile */}
      <section id="profile" className="card mc-top mt-4 scroll-mt-20 p-4 pt-5">
        <h2 className="text-sm font-bold text-slate-900">{mr ? 'मी आहे… (एक किंवा अधिक निवडा)' : 'I am… (pick one or more)'}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const on = cats.has(c.id);
            return (
              <button key={c.id} onClick={() => toggleCat(c.id)} aria-pressed={on}
                className="chip border py-2 text-[13px] transition-colors"
                style={on ? { background: TONES.personal.color, color: '#fff', borderColor: TONES.personal.color } : { background: '#fff', borderColor: 'var(--line)', color: '#334155' }}>
                {c.icon} {mr ? c.mr : c.en}
              </button>
            );
          })}
        </div>
        {needsNcmc && (
          <label className="mt-3 flex items-center gap-2 rounded-xl p-2.5 text-[13px] font-semibold" style={{ background: TONES.urgent.soft, color: TONES.urgent.color }}>
            <input type="checkbox" checked={profile.hasNcmc} onChange={(e) => void saveProfile({ ...profile, hasNcmc: e.target.checked })} className="h-4 w-4" />
            {mr ? 'माझ्याकडे सक्रिय NCMC स्मार्ट कार्ड आहे' : 'I already have an active NCMC smart card'}
          </label>
        )}
        <p className="mt-2 text-[11px] text-slate-500">{mr ? 'ही माहिती फक्त तुमच्या फोनमध्ये राहते.' : 'Stored only on your phone.'}</p>
      </section>

      {/* My pass */}
      <section id="my-pass" className="card mc-top mt-3 scroll-mt-20 p-4 pt-5">
        <h2 className="text-sm font-bold text-slate-900">🎫 {mr ? 'माझा पास — मुदत संपण्याआधी आठवण' : 'My pass — reminder before it expires'}</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value as PassKind)}>
            {PASS_KINDS.map((k) => <option key={k.id} value={k.id}>{mr ? k.mr : k.en}</option>)}
          </select>
          <input type="date" className="field" value={expires} min={localISO()} onChange={(e) => setExpires(e.target.value)} aria-label={mr ? 'मुदत संपण्याची तारीख' : 'Expiry date'} />
        </div>
        <div className="mt-2 flex gap-2">
          <button className="btn-primary flex-1" disabled={!expires} onClick={() => void saveMyPass({ kind, expires })}>
            {pass ? (mr ? 'अपडेट करा' : 'Update') : (mr ? 'आठवण लावा' : 'Set reminder')}
          </button>
          {pass && <button className="btn-ghost" onClick={() => { setExpires(''); void saveMyPass(null); }}>{mr ? 'काढा' : 'Remove'}</button>}
        </div>
        <div className="mt-2 flex gap-1.5 text-[11px] font-semibold">
          <span className="rounded-full px-2 py-0.5" style={{ background: TONES.personal.soft, color: TONES.personal.color }}>{mr ? '७ दिवस आधी' : '7 days before'}</span>
          <span className="rounded-full px-2 py-0.5" style={{ background: TONES.action.soft, color: TONES.action.color }}>{mr ? '३ दिवस' : '3 days'}</span>
          <span className="rounded-full px-2 py-0.5" style={{ background: TONES.urgent.soft, color: TONES.urgent.color }}>{mr ? '१ दिवस / आज' : '1 day / today'}</span>
        </div>
      </section>

      {/* Schemes */}
      <div className="mt-5 grid gap-3">
        {ordered.map((s) => <SchemeCard key={s.id} s={s} mine={mineIds.has(s.id)} />)}
      </div>

      <section className="card mt-4 p-4">
        <h2 className="text-sm font-bold text-slate-900">{mr ? 'अधिकृत दुवे' : 'Official links'}</h2>
        <div className="mt-2 grid gap-2">
          {OFFICIAL_LINKS.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="tile justify-between text-sm font-semibold text-slate-800">
              {mr ? l.mr : l.en}<span className="text-slate-400">↗</span>
            </a>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          {mr ? 'दर व नियम बदलू शकतात. प्रवासापूर्वी आगार / अधिकृत संकेतस्थळावर खात्री करा. ही स्वतंत्र सेवा आहे — MSRTCशी संलग्न नाही. माहिती तपासली: २८ सप्टेंबर २०२६.'
              : 'Fares and rules change. Confirm at the depot / official website before travelling. Independent service — not affiliated with MSRTC. Checked: 28 Sep 2026.'}
        </p>
      </section>
    </div>
  );
}
