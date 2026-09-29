import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { useI18n, localName } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { PinIcon } from '@/components/Icons';
import type { Stop } from '@/types/domain';

function haversine(lat1:number, lon1:number, lat2:number, lon2:number){
  const R=6371;
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export function NearbyPage(){
  const { core } = useData();
  const { lang } = useI18n();
  const [pos,setPos]=useState<GeolocationPosition|null>(null);
  const [err,setErr]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);

  const request = ()=>{
    if(!navigator.geolocation){ setErr('या डिव्हाइसवर लोकेशन उपलब्ध नाही.'); return; }
    setLoading(true); setErr(null);
    navigator.geolocation.getCurrentPosition(p=>{setPos(p); setLoading(false);}, e=>{
      if(e.code===1) setErr('परवानगी नाकारली — सेटिंग्जमध्ये लोकेशन चालू करा.');
      else setErr('लोकेशन मिळू शकले नाही. पुन्हा प्रयत्न करा.');
      setLoading(false);
    }, {enableHighAccuracy:false, timeout:10000, maximumAge:60000});
  };

  useEffect(()=>{ request(); },[]);

  const stops = core?.stops.filter(s=> s.lat!=null && s.lng!=null) as Stop[] ?? [];
  const sorted = pos ? [...stops].map(s=> ({s, d: haversine(pos.coords.latitude,pos.coords.longitude,s.lat!,s.lng!)})).sort((a,b)=>a.d-b.d).slice(0,20) : [];

  return (
    <div className="container-app">
      <Seo title="जवळचे बस स्थानक — Maharashtra ST" description="तुमच्या जवळचे एसटी बस स्थानक शोधा" path="/nearby" />
      <h1 className="mt-4 text-xl font-bold text-slate-900">📍 जवळचे बस स्थानक</h1>
      <p className="mt-1 text-sm text-slate-600">तुमच्या जवळपासचे एसटी स्थानक — अंतरासह. लोकेशन फक्त तुमच्या परवानगीनंतर वापरले जाते.</p>

      <div className="card mt-4 p-4">
        {!pos && !err && !loading && (
          <div className="text-center py-4">
            <p className="text-sm text-slate-600">जवळचे स्थानक दाखवण्यासाठी लोकेशन परवानगी द्या.</p>
            <button onClick={request} className="btn-primary mt-3">📍 लोकेशन चालू करा</button>
          </div>
        )}
        {loading && <p className="text-center py-6 text-sm text-slate-500">लोकेशन घेत आहे…</p>}
        {err && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">{err}</p>
            <button onClick={request} className="btn-primary mt-2 text-sm">पुन्हा प्रयत्न करा</button>
          </div>
        )}
        {pos && (
          <div className="mb-3 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
            ✅ लोकेशन मिळाले — {pos.coords.latitude.toFixed(4)}, {pos.coords.longitude.toFixed(4)} · अचूकता ~{Math.round(pos.coords.accuracy)}m
          </div>
        )}
        {sorted.length>0 && (
          <ul className="divide-y divide-slate-100">
            {sorted.map(({s,d})=>(
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <Link to={`/station/${s.id}`} className="font-semibold text-slate-900 hover:text-st-700 text-[15px]">{localName(lang,s)}</Link>
                  <p className="text-xs text-slate-500">{s.district} · {s.division} {s.depot?`· ${s.depot}`:''}</p>
                  <p className="text-xs font-medium text-st-700">{d<1 ? `${Math.round(d*1000)} मीटर` : `${d.toFixed(1)} किमी`}</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Link to={`/station/${s.id}`} className="btn-ghost text-xs py-2">वेळापत्रक</Link>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`} target="_blank" rel="noreferrer" className="btn-ghost text-xs py-2">🗺️ नकाशावर पहा</a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card mt-3 p-4 border-blue-100 bg-blue-50">
        <p className="text-xs text-blue-900 leading-relaxed">🔒 गोपनीयता: लोकेशन फक्त जवळचे स्थानक दाखवण्यासाठी वापरले जाते, सर्व्हरवर पाठवले जात नाही. परवानगी तुम्ही कधीही सेटिंग्जमधून बंद करू शकता.</p>
      </div>
    </div>
  );
}
