import {
  isNativeAdMobAvailable,
  getGoogleMobileAds,
  getAppOpenAdUnitId,
  getInterstitialAdUnitId,
  AD_REQUEST_OPTIONS,
} from '../constants/AdsConfig';

// Session state tracking
let hasShownAppOpenInSession = false;
let isAppOpenLoading = false;

let interstitialAdInstance: any = null;
let isInterstitialLoading = false;
let isInterstitialLoaded = false;

/**
 * Loads and displays an App Open Ad on cold start or app launch.
 * Includes session throttling so users are not interrupted repeatedly.
 */
export const showAppOpenAdOnLaunch = (): void => {
  try {
    if (!isNativeAdMobAvailable()) return;
    if (hasShownAppOpenInSession || isAppOpenLoading) return;

    const googleAds = getGoogleMobileAds();
    if (!googleAds || !googleAds.AppOpenAd || !googleAds.AdEventType) return;

    const adUnitId = getAppOpenAdUnitId();
    if (!adUnitId) return;

    isAppOpenLoading = true;
    const appOpenAd = googleAds.AppOpenAd.createForAdRequest(adUnitId, AD_REQUEST_OPTIONS);

    // UX Safeguard: Cancel presentation if load takes longer than 4.5s to prevent interrupting user
    let isCancelled = false;
    const loadTimeout = setTimeout(() => {
      isCancelled = true;
      isAppOpenLoading = false;
    }, 4500);

    const unsubscribeLoaded = appOpenAd.addAdEventListener(
      googleAds.AdEventType.LOADED,
      () => {
        clearTimeout(loadTimeout);
        if (isCancelled) {
          unsubscribeLoaded();
          return;
        }
        isAppOpenLoading = false;
        hasShownAppOpenInSession = true;
        appOpenAd.show().catch((err: any) => {
          console.warn('[AdService] AppOpenAd show error:', err);
        });
        unsubscribeLoaded();
      }
    );

    const unsubscribeError = appOpenAd.addAdEventListener(
      googleAds.AdEventType.ERROR,
      (error: any) => {
        clearTimeout(loadTimeout);
        console.warn('[AdService] AppOpenAd failed to load:', error);
        isAppOpenLoading = false;
        unsubscribeError();
      }
    );

    appOpenAd.load();
  } catch (error) {
    console.warn('[AdService] AppOpenAd exception:', error);
    isAppOpenLoading = false;
  }
};

/**
 * Pre-caches an Interstitial Ad in background memory so it can be shown
 * instantly upon task completion (e.g. employee checkout).
 */
export const preloadInterstitialAd = (): void => {
  try {
    if (!isNativeAdMobAvailable()) return;
    if (isInterstitialLoaded || isInterstitialLoading) return;

    const googleAds = getGoogleMobileAds();
    if (!googleAds || !googleAds.InterstitialAd || !googleAds.AdEventType) return;

    const adUnitId = getInterstitialAdUnitId();
    if (!adUnitId) return;

    isInterstitialLoading = true;
    const interstitial = googleAds.InterstitialAd.createForAdRequest(adUnitId, AD_REQUEST_OPTIONS);

    const unsubscribeLoaded = interstitial.addAdEventListener(
      googleAds.AdEventType.LOADED,
      () => {
        isInterstitialLoading = false;
        isInterstitialLoaded = true;
        interstitialAdInstance = interstitial;
        unsubscribeLoaded();
      }
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      googleAds.AdEventType.CLOSED,
      () => {
        isInterstitialLoaded = false;
        interstitialAdInstance = null;
        unsubscribeClosed();
        // Preload next interstitial for subsequent actions
        preloadInterstitialAd();
      }
    );

    const unsubscribeError = interstitial.addAdEventListener(
      googleAds.AdEventType.ERROR,
      (error: any) => {
        console.warn('[AdService] InterstitialAd failed to load:', error);
        isInterstitialLoading = false;
        isInterstitialLoaded = false;
        interstitialAdInstance = null;
        unsubscribeError();
      }
    );

    interstitial.load();
  } catch (error) {
    console.warn('[AdService] Interstitial preload exception:', error);
    isInterstitialLoading = false;
  }
};

/**
 * Shows the preloaded Interstitial Ad if ready.
 * Returns true if the ad was shown, false if it fell back or wasn't ready.
 */
export const showInterstitialAd = async (): Promise<boolean> => {
  try {
    if (!isNativeAdMobAvailable()) return false;

    if (isInterstitialLoaded && interstitialAdInstance) {
      await interstitialAdInstance.show();
      return true;
    }

    // If not ready yet, trigger preload for next time
    preloadInterstitialAd();
    return false;
  } catch (error) {
    console.warn('[AdService] showInterstitialAd error:', error);
    isInterstitialLoaded = false;
    interstitialAdInstance = null;
    preloadInterstitialAd();
    return false;
  }
};
