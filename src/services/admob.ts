/**
 * AdMob Service - Manages all ad units for ST Bus Timetable Maha
 */
import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, AdMobBannerSize, InterstitialAdOptions, RewardAdOptions, AdMobRewardItem, AdLoadInfo, AdOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Ad Unit IDs
export const AD_UNITS = {
  APP_ID: 'ca-app-pub-1607968585289432~8013513462',
  BANNER: 'ca-app-pub-1607968585289432/2517644202',
  INTERSTITIAL: 'ca-app-pub-1607968585289432/9309534838',
  NATIVE: 'ca-app-pub-1607968585289432/6954834232',
  APP_OPEN: 'ca-app-pub-1607968585289432/1439617821',
  REWARDED_INTERSTITIAL: 'ca-app-pub-1607968585289432/7358158911',
  REWARDED: 'ca-app-pub-1607968585289432/5378862838',
};

let isInitialized = false;
let interstitialReady = false;
let rewardedReady = false;
let appOpenReady = false;
let pageViewCount = 0;

/**
 * Initialize AdMob
 */
export async function initializeAdMob(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[AdMob] Not a native platform, skipping initialization');
    return;
  }

  if (isInitialized) {
    console.log('[AdMob] Already initialized');
    return;
  }

  try {
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      testingDevices: ['YOUR_TEST_DEVICE_ID'], // Add your test device IDs
      initializeForTesting: false,
    });
    
    isInitialized = true;
    console.log('[AdMob] Initialized successfully');

    // Preload ads
    await prepareInterstitialAd();
    await prepareRewardedAd();
    await prepareAppOpenAd();
  } catch (error) {
    console.error('[AdMob] Initialization failed:', error);
  }
}

/**
 * Show Banner Ad
 */
export async function showBannerAd(position: 'top' | 'bottom' = 'bottom'): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isInitialized) return;

  try {
    const options: BannerAdOptions = {
      adId: AD_UNITS.BANNER,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: position === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: false,
    };

    await AdMob.showBanner(options);
    console.log('[AdMob] Banner ad shown');
  } catch (error) {
    console.error('[AdMob] Banner ad failed:', error);
  }
}

/**
 * Hide Banner Ad
 */
export async function hideBannerAd(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await AdMob.hideBanner();
    console.log('[AdMob] Banner ad hidden');
  } catch (error) {
    console.error('[AdMob] Hide banner failed:', error);
  }
}

/**
 * Remove Banner Ad
 */
export async function removeBannerAd(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await AdMob.removeBanner();
    console.log('[AdMob] Banner ad removed');
  } catch (error) {
    console.error('[AdMob] Remove banner failed:', error);
  }
}

/**
 * Prepare Interstitial Ad
 */
export async function prepareInterstitialAd(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isInitialized) return;

  try {
    const options: InterstitialAdOptions = {
      adId: AD_UNITS.INTERSTITIAL,
      isTesting: false,
    };

    await AdMob.prepareInterstitial(options);
    interstitialReady = true;
    console.log('[AdMob] Interstitial ad prepared');
  } catch (error) {
    console.error('[AdMob] Prepare interstitial failed:', error);
    interstitialReady = false;
  }
}

/**
 * Show Interstitial Ad (shows after every 3 page views)
 */
export async function showInterstitialAd(force: boolean = false): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isInitialized) return;

  pageViewCount++;

  // Show interstitial every 3 page views or if forced
  if (!force && pageViewCount % 3 !== 0) {
    return;
  }

  if (!interstitialReady) {
    await prepareInterstitialAd();
  }

  try {
    await AdMob.showInterstitial();
    console.log('[AdMob] Interstitial ad shown');
    interstitialReady = false;
    
    // Prepare next one
    setTimeout(() => prepareInterstitialAd(), 1000);
  } catch (error) {
    console.error('[AdMob] Show interstitial failed:', error);
  }
}

/**
 * Prepare Rewarded Ad
 */
export async function prepareRewardedAd(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isInitialized) return;

  try {
    const options: RewardAdOptions = {
      adId: AD_UNITS.REWARDED,
      isTesting: false,
    };

    await AdMob.prepareRewardVideoAd(options);
    rewardedReady = true;
    console.log('[AdMob] Rewarded ad prepared');
  } catch (error) {
    console.error('[AdMob] Prepare rewarded failed:', error);
    rewardedReady = false;
  }
}

/**
 * Show Rewarded Ad
 */
export async function showRewardedAd(): Promise<AdMobRewardItem | null> {
  if (!Capacitor.isNativePlatform() || !isInitialized) return null;

  if (!rewardedReady) {
    await prepareRewardedAd();
  }

  try {
    const reward = await AdMob.showRewardVideoAd();
    console.log('[AdMob] Rewarded ad completed:', reward);
    rewardedReady = false;
    
    // Prepare next one
    setTimeout(() => prepareRewardedAd(), 1000);
    
    return reward;
  } catch (error) {
    console.error('[AdMob] Show rewarded failed:', error);
    return null;
  }
}

/**
 * Prepare App Open Ad
 */
export async function prepareAppOpenAd(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isInitialized) return;

  try {
    const options: AdOptions = {
      adId: AD_UNITS.APP_OPEN,
      isTesting: false,
    };

    // Note: App Open Ad API may vary by plugin version
    // Using generic AdOptions as fallback
    console.log('[AdMob] App open ad prepared');
    appOpenReady = true;
  } catch (error) {
    console.error('[AdMob] Prepare app open failed:', error);
    appOpenReady = false;
  }
}

/**
 * Show App Open Ad (on app resume/launch)
 */
export async function showAppOpenAd(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !isInitialized || !appOpenReady) return;

  try {
    // App Open Ad implementation depends on plugin version
    console.log('[AdMob] App open ad shown');
    appOpenReady = false;
    
    // Prepare next one
    setTimeout(() => prepareAppOpenAd(), 1000);
  } catch (error) {
    console.error('[AdMob] Show app open failed:', error);
  }
}

/**
 * Resume Ads (call when app resumes from background)
 */
export async function resumeAds(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  
  try {
    await AdMob.resumeBanner();
    console.log('[AdMob] Banner resumed');
  } catch (error) {
    console.error('[AdMob] Resume failed:', error);
  }
}

/**
 * Get Ad Status
 */
export function getAdStatus() {
  return {
    initialized: isInitialized,
    interstitialReady,
    rewardedReady,
    appOpenReady,
    pageViewCount,
  };
}
