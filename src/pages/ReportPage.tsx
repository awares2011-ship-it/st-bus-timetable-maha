import { useState } from 'react';
import { Seo } from '@/components/Seo';

export function ReportPage(){
  const [sent,setSent]=useState(false);
  const [form,setForm]=useState({type:'वेळ चुकीची आहे', desc:'', contact:''});
  if(sent) return (
    <div className="container-app">
      <Seo title="अहवाल पाठवला — धन्यवाद" description="चुकीची एसटी वेळापत्रक माहिती कळवल्याबद्दल धन्यवाद." path="/report" />
      <div className="card mt-6 p-6 text-center">
        <p className="text-3xl">✅</p>
        <h1 className="mt-2 font-bold text-slate-900">धन्यवाद!</h1>
        <p className="mt-1 text-sm text-slate-600">तुमचा अहवाल नोंदवला गेला. आम्ही पडताळणी करून दुरुस्ती करू. हा अहवाल थेट अधिकृत डेटा बदलत नाही.</p>
      </div>
    </div>
  );
  return (
    <div className="container-app">
      <Seo title="चुकीची माहिती कळवा" description="एसटी बसची चुकीची वेळ, मार्ग किंवा स्थानक कळवा." path="/report" />
      <h1 className="mt-4 text-xl font-bold">⚠️ चुकीची माहिती कळवा</h1>
      <p className="mt-1 text-sm text-slate-600">बस चालू नाही / वेळ / मार्ग / आगार चुकीचे असल्यास कळवा. आम्ही फीडबॅक म्हणून तपासू.</p>
      <form onSubmit={e=>{e.preventDefault(); setSent(true);}} className="card mt-4 p-4 space-y-3">
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">समस्या प्रकार</span>
          <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="field mt-1">
            <option>बस चालू नाही</option>
            <option>वेळ चुकीची आहे</option>
            <option>मार्ग चुकीचा आहे</option>
            <option>आगाराची माहिती चुकीची आहे</option>
            <option>इतर</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">तपशील (मार्ग, वेळ, स्थानक)</span>
          <textarea value={form.desc} onChange={e=>setForm({...form,desc:e.target.value})} required rows={4} placeholder="उदा. पुणे→नाशिक 06:30 साधी — आज बस आली नाही" className="field mt-1" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-600">संपर्क (ऐच्छिक)</span>
          <input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} placeholder="मोबाइल / ईमेल" className="field mt-1" />
        </label>
        <button type="submit" className="btn-primary w-full">पाठवा</button>
        <p className="text-[11px] text-slate-400">नोंद: हा अहवाल थेट वेळापत्रक बदलत नाही — पडताळणीनंतरच दुरुस्ती होते.</p>
      </form>
    </div>
  );
}
