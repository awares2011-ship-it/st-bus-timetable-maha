import { useEffect, useState } from 'react';
import { isRouteSubscribed, setRouteSubscribed, notifier, isOptedIn } from '@/services/notifications';

export function RouteSubscribeButton({ routeId }: { routeId: string }){
  const [sub,setSub]=useState(false);
  const [supported,setSupported]=useState(false);
  useEffect(()=>{ setSupported(notifier.isSupported()); isRouteSubscribed(routeId).then(setSub); },[routeId]);
  if(!supported) return null;
  const toggle=async()=>{
    const opt=await isOptedIn();
    if(!opt){ const ok=await notifier.requestPermission(); if(!ok) return; await import('@/services/notifications').then(m=>m.setOptedIn(true)); }
    const next=!sub; setSub(next); await setRouteSubscribed(routeId, next);
    if(next) await notifier.notify('🔔 सूचना चालू', 'या मार्गावरील वेळापत्रक बदलल्यास कळवले जाईल.', routeId);
  };
  return (
    <button onClick={toggle} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${sub?'bg-amber-100 border-amber-300 text-amber-800':'bg-white border-slate-200 text-slate-600'}`}>
      <span>{sub?'🔔':'🔕'}</span> {sub?'सूचना चालू':'सूचना मिळवा'}
    </button>
  );
}
