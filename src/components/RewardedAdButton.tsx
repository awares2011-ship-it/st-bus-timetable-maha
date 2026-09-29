/**
 * RewardedAdButton - Component for showing rewarded ads
 * Users can watch ads to unlock features or get ad-free experience
 */
import { useState } from 'react';
import { showRewardedAd } from '@/services/admob';
import { useI18n } from '@/i18n/I18nContext';

interface RewardedAdButtonProps {
  onRewardEarned?: () => void;
  rewardDescription?: string;
  className?: string;
}

export function RewardedAdButton({ 
  onRewardEarned, 
  rewardDescription = 'Watch ad to unlock',
  className = '' 
}: RewardedAdButtonProps) {
  const { lang } = useI18n();
  const [isLoading, setIsLoading] = useState(false);

  const handleWatchAd = async () => {
    setIsLoading(true);
    
    try {
      const reward = await showRewardedAd();
      
      if (reward) {
        console.log('[RewardedAd] Reward earned:', reward);
        onRewardEarned?.();
        
        // Show success message
        alert(lang === 'mr' 
          ? 'धन्यवाद! तुम्हाला बक्षीस मिळाले आहे.' 
          : 'Thank you! You have earned your reward.');
      }
    } catch (error) {
      console.error('[RewardedAd] Failed:', error);
      alert(lang === 'mr' 
        ? 'जाहिरात लोड करण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.' 
        : 'Failed to load ad. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleWatchAd}
      disabled={isLoading}
      className={`btn-primary flex items-center justify-center gap-2 ${className}`}
    >
      {isLoading ? (
        <>
          <span className="animate-spin">⏳</span>
          {lang === 'mr' ? 'लोड करत आहे...' : 'Loading...'}
        </>
      ) : (
        <>
          <span>🎁</span>
          {lang === 'mr' ? 'जाहिरात पाहा आणि बक्षीस मिळवा' : rewardDescription}
        </>
      )}
    </button>
  );
}

/**
 * AdFreePrompt - Offers temporary ad-free experience via rewarded ad
 */
export function AdFreePrompt({ onAdFreeUnlocked }: { onAdFreeUnlocked?: () => void }) {
  const { lang } = useI18n();

  return (
    <div className="card p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🎯</span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900">
            {lang === 'mr' ? 'जाहिरातमुक्त अनुभव' : 'Ad-Free Experience'}
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            {lang === 'mr' 
              ? 'एक जाहिरात पाहा आणि 30 मिनिटे जाहिरातमुक्त ब्राउझिंगचा आनंद घ्या!'
              : 'Watch one ad and enjoy 30 minutes of ad-free browsing!'}
          </p>
          <div className="mt-3">
            <RewardedAdButton 
              onRewardEarned={onAdFreeUnlocked}
              rewardDescription={lang === 'mr' ? 'जाहिरातमुक्त करा' : 'Unlock Ad-Free'}
              className="w-full text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FeatureUnlockCard - Generic card for unlocking features with rewarded ads
 */
export function FeatureUnlockCard({ 
  title, 
  description, 
  onUnlock,
  icon = '⭐'
}: { 
  title: string; 
  description: string; 
  onUnlock: () => void;
  icon?: string;
}) {
  return (
    <div className="card p-4 bg-amber-50 border-2 border-amber-200">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-600 mt-1">{description}</p>
          <div className="mt-3">
            <RewardedAdButton 
              onRewardEarned={onUnlock}
              className="w-full text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
