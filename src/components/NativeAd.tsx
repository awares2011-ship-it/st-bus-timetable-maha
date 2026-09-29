/**
 * NativeAd - Native ad component for lists
 * Note: Native ads require additional setup and may vary by AdMob plugin version
 */
import { useEffect, useRef } from 'react';

interface NativeAdProps {
  className?: string;
}

export function NativeAd({ className = '' }: NativeAdProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Native ad initialization would go here
    // This is a placeholder as native ads require additional setup
    console.log('[NativeAd] Container ready for native ad');
  }, []);

  // On web, show a styled placeholder
  if (typeof window !== 'undefined' && !window.Capacitor) {
    return (
      <div className={`card p-4 bg-gradient-to-br from-blue-50 to-purple-50 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="h-16 w-16 rounded-lg bg-slate-200 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-600 mb-1">Sponsored</p>
            <p className="text-sm font-bold text-slate-800 mb-1">Native Advertisement</p>
            <p className="text-xs text-slate-500 line-clamp-2">
              Your ad content would appear here with custom styling that matches your app.
            </p>
          </div>
        </div>
        <button className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white">
          Learn More
        </button>
      </div>
    );
  }

  // On native, return container for native ad
  return (
    <div 
      ref={containerRef} 
      className={`native-ad-container ${className}`}
      aria-label="Native Advertisement"
    >
      {/* Native ad will be injected here by SDK */}
      <div className="card p-4 bg-slate-50">
        <p className="text-xs text-center text-slate-400">Loading ad...</p>
      </div>
    </div>
  );
}

/**
 * List Native Ad - Native ad styled for list items
 */
export function ListNativeAd({ className = '' }: NativeAdProps) {
  if (typeof window !== 'undefined' && !window.Capacitor) {
    return (
      <div className={`tile bg-gradient-to-r from-amber-50 to-orange-50 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-orange-200 shrink-0 flex items-center justify-center">
            <span className="text-lg">📢</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-orange-600 font-semibold">Sponsored</p>
            <p className="text-sm font-bold text-slate-800">Featured Service</p>
          </div>
          <button className="shrink-0 rounded-lg bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white">
            View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`list-native-ad-container ${className}`} aria-label="Sponsored">
      <div className="tile bg-slate-50">
        <p className="text-xs text-center text-slate-400">Ad</p>
      </div>
    </div>
  );
}
