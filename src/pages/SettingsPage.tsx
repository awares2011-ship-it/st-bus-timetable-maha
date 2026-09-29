import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { Seo } from '@/components/Seo';
import { LockScreenCard } from '@/components/LockScreenCard';
import { AdFreePrompt } from '@/components/RewardedAdButton';
import { useFavorites } from '@/hooks/useFavorites';

export function SettingsPage(){
  const { lang, setLang, t } = useI18n();
  const { favorites } = useFavorites();
  const [cacheInfo,setCacheInfo]=useState<string>('');
  const [isAdFree, setIsAdFree] = useState(false);

  useEffect(()=>{ if('caches' in window){ caches.keys().then(k=> setCacheInfo(k.join(', ')||'Cache API उपलब्ध')).catch(()=>{});} },[]);

  const clearCache=async()=>{
    if('caches' in window){ const keys=await caches.keys(); await Promise.all(keys.map(k=>caches.delete(k))); setCacheInfo('कॅश साफ केला'); }
    localStorage.clear(); alert('कॅश आणि स्थानिक डेटा साफ केला');
  };

  const handleAdFreeUnlocked = () => {
    setIsAdFree(true);
    // Store ad-free status with expiry time (30 minutes)
    const expiryTime = Date.now() + (30 * 60 * 1000);
    localStorage.setItem('adFreeUntil', expiryTime.toString());
    alert(lang === 'mr' 
      ? '30 मिनिटे जाहिरातमुक्त! आनंद घ्या! 🎉' 
      : '30 minutes ad-free! Enjoy! 🎉');
  };

  // Check if ad-free is still active
  useEffect(() => {
    const adFreeUntil = localStorage.getItem('adFreeUntil');
    if (adFreeUntil && Date.now() < parseInt(adFreeUntil)) {
      setIsAdFree(true);
    }
  }, []);

  return (
    <div className="container-app pb-8">
      <Seo title="सेटिंग्ज — Maharashtra ST" description="भाषा, सूचना, डेटा, गोपनीयता सेटिंग्ज" path="/settings" />
      <h1 className="mt-4 text-xl font-bold text-slate-900">⚙️ सेटिंग्ज</h1>

      {/* Language */}
      <section className="card mt-4 p-4">
        <h2 className="font-semibold text-slate-800">🌐 भाषा / Language</h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(['mr','en','hi'] as const).map(l=>(
            <button key={l} onClick={()=>setLang(l)} className={`rounded-xl border py-3 text-sm font-semibold ${lang===l?'bg-st-700 text-white border-st-700':'bg-white border-slate-200'}`}>{l==='mr'?'मराठी':l==='en'?'English':'हिंदी'}</button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">निवडलेली भाषा लक्षात ठेवली जाईल.</p>
      </section>

      {/* Lock-screen notifications */}
      <LockScreenCard />

      {/* Ad-Free Prompt */}
      {!isAdFree && (
        <div className="mt-3">
          <AdFreePrompt onAdFreeUnlocked={handleAdFreeUnlocked} />
        </div>
      )}

      {isAdFree && (
        <div className="card mt-3 p-4 bg-green-50 border-2 border-green-200">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-bold text-green-900">
                {lang === 'mr' ? 'जाहिरातमुक्त सक्रिय!' : 'Ad-Free Active!'}
              </p>
              <p className="text-xs text-green-700">
                {lang === 'mr' ? '30 मिनिटे जाहिरातमुक्त अनुभव' : '30 minutes of ad-free experience'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Favorites & Cache */}
      <section className="card mt-3 p-4">
        <h3 className="text-sm font-semibold">❤️ आवडते मार्ग</h3>
        <p className="text-xs text-slate-500">{favorites.length} जतन केलेले</p>
        <Link to="/favorites" className="btn-ghost mt-2 text-xs">पहा / संपादित करा</Link>
      </section>

      <section className="card mt-3 p-4">
        <h3 className="text-sm font-semibold">💾 डेटा / कॅशे</h3>
        <p className="text-xs text-slate-500 break-all">{cacheInfo||'—'}</p>
        <button onClick={clearCache} className="btn-ghost mt-2 text-xs bg-red-50 text-red-700">कॅश साफ करा</button>
        <p className="mt-1 text-[11px] text-slate-400">ऑफलाइनसाठी जतन केलेले वेळापत्रक येथे दिसते. “शेवटचे अपडेट” नेहमी तपासा.</p>
      </section>

      {/* Links */}
      <section className="card mt-3 divide-y divide-slate-100 overflow-hidden">
        <a href="https://msrtcors.co.in" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-800">🌐 MSRTC अधिकृत संकेतस्थळ</p>
            <p className="text-xs text-slate-500">msrtcors.co.in · ऑनलाइन तिकीट बुकिंग</p>
          </div>
          <span className="text-slate-300">›</span>
        </a>
        <Link to="/about" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-800">🔒 गोपनीयता धोरण</p>
            <p className="text-xs text-slate-500">Privacy Policy</p>
          </div>
          <span className="text-slate-300">›</span>
        </Link>
        <Link to="/about" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-800">📜 अटी व शर्ती</p>
            <p className="text-xs text-slate-500">Terms & Conditions</p>
          </div>
          <span className="text-slate-300">›</span>
        </Link>
        <Link to="/about" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-800">📞 आमच्याशी संपर्क</p>
            <p className="text-xs text-slate-500">Contact Us</p>
          </div>
          <span className="text-slate-300">›</span>
        </Link>
        <Link to="/about" className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-800">ℹ️ अ‍ॅपबद्दल</p>
            <p className="text-xs text-slate-500">About Us</p>
          </div>
          <span className="text-slate-300">›</span>
        </Link>
      </section>

      <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3">
        <p className="text-xs text-amber-900">ही स्वतंत्र सेवा आहे — MSRTCशी संलग्न नाही. वेळापत्रक बदलू शकते. प्रवासापूर्वी अधिकृत स्रोतावर खात्री करा.</p>
      </div>
    </div>
  );
}
