/**
 * AdBanner - Reusable banner ad component
 */
import { useEffect, useState } from 'react';
import { showBannerAd, removeBannerAd } from '@/services/admob';

interface AdBannerProps {
  position?: 'top' | 'bottom';
  className?: string;
}

export function AdBanner({ position = 'bottom', className = '' }: AdBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show banner ad when component mounts
    const showAd = async () => {
      try {
        await showBannerAd(position);
        setIsVisible(true);
      } catch (error) {
        console.error('[AdBanner] Failed to show:', error);
      }
    };

    showAd();

    // Cleanup: remove banner when component unmounts
    return () => {
      removeBannerAd().catch(err => console.error('[AdBanner] Cleanup failed:', err));
    };
  }, [position]);

  // On web, show a placeholder
  if (typeof window !== 'undefined' && !window.Capacitor) {
    return (
      <div className={`bg-slate-100 border border-slate-200 rounded-lg p-3 text-center ${className}`}>
        <p className="text-xs text-slate-400">Advertisement Space</p>
      </div>
    );
  }

  // On native, the ad is rendered by the SDK (no DOM element needed)
  // But we return a spacer to reserve space
  return isVisible ? (
    <div className={`h-12 ${className}`} aria-label="Advertisement" />
  ) : null;
}

/**
 * Inline Ad Banner (for use within content - shows in middle of page)
 */
export function InlineAdBanner({ className = '' }: { className?: string }) {
  // On web, show placeholder
  if (typeof window !== 'undefined' && !window.Capacitor) {
    return (
      <div className={`my-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-slate-200 rounded-xl p-4 text-center ${className}`}>
        <p className="text-xs font-medium text-slate-500 mb-2">प्रायोजित जाहिरात</p>
        <div className="bg-white rounded-lg p-8 border border-slate-200">
          <p className="text-sm text-slate-400">Advertisement</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-6 ${className}`}>
      <p className="text-[10px] text-slate-400 text-center mb-2">प्रायोजित जाहिरात</p>
      <div className="h-20 bg-slate-50 rounded-lg border border-slate-200" aria-label="Advertisement" />
    </div>
  );
}
