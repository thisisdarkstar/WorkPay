import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Checks whether the app is currently running inside Expo Go client or Web.
 * In Expo Go, custom native binary modules (like AdMob) are not compiled in.
 */
export const isExpoGo = (): boolean => {
  if (Platform.OS === 'web') return true;
  try {
    const env = (Constants?.executionEnvironment as string) || '';
    const ownership = (Constants?.appOwnership as string) || '';
    return env === 'storeClient' || ownership === 'expo';
  } catch {
    return false;
  }
};

/**
 * Google AdMob Configuration for WorkPay
 *
 * NOTE ON TESTING & COMPLIANCE:
 * - Always use Google test ad unit IDs during development and internal testing.
 * - Clicking or loading real ads during development violates AdMob policies
 *   and can lead to immediate account suspension for invalid traffic.
 * - When ready for production, provide your live AdMob Banner ID via
 *   the EXPO_PUBLIC_ADMOB_BANNER_ID environment variable in your .env or EAS secrets.
 */

// Official Google Sample / Test Ad Unit IDs
export const ADMOB_TEST_IDS = {
  // Official AdMob Android Test Banner ID (Fixed 320x50)
  ANDROID_BANNER: 'ca-app-pub-3940256099942544/6300978111',
  // Official AdMob Android Test Adaptive Banner ID
  ANDROID_ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/9214589741',
  // Official AdMob Android Test App Open ID
  ANDROID_APP_OPEN: 'ca-app-pub-3940256099942544/9257395921',
  // Official AdMob Android Test Interstitial ID
  ANDROID_INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',

  // Official AdMob iOS Test Banner ID (Fixed 320x50)
  IOS_BANNER: 'ca-app-pub-3940256099942544/2934735716',
  // Official AdMob iOS Test Adaptive Banner ID
  IOS_ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/2435281174',
  // Official AdMob iOS Test App Open ID
  IOS_APP_OPEN: 'ca-app-pub-3940256099942544/5575463023',
  // Official AdMob iOS Test Interstitial ID
  IOS_INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910',

  // Official AdMob Android Test App ID
  ANDROID_APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  // Official AdMob iOS Test App ID
  IOS_APP_ID: 'ca-app-pub-3940256099942544~1458002511',
};

/**
 * Resolves the appropriate Banner Ad Unit ID based on the environment and platform.
 * In development (__DEV__ === true), it ALWAYS returns the safe Google Test ID.
 */
export const getBannerAdUnitId = (isAdaptive: boolean = true): string => {
  const googleAds = getGoogleMobileAds();
  const defaultTestId = isAdaptive
    ? (googleAds?.TestIds?.ADAPTIVE_BANNER || (Platform.OS === 'ios' ? ADMOB_TEST_IDS.IOS_ADAPTIVE_BANNER : ADMOB_TEST_IDS.ANDROID_ADAPTIVE_BANNER))
    : (googleAds?.TestIds?.BANNER || (Platform.OS === 'ios' ? ADMOB_TEST_IDS.IOS_BANNER : ADMOB_TEST_IDS.ANDROID_BANNER));

  if (__DEV__) {
    return defaultTestId;
  }

  // Production Ad Unit ID from environment variable, falling back to test ID if not yet configured
  const productionId = process.env.EXPO_PUBLIC_ADMOB_BANNER_ID;
  if (productionId && productionId.trim().length > 0) {
    return productionId.trim();
  }

  return defaultTestId;
};

/**
 * Resolves the App Open Ad Unit ID.
 */
export const getAppOpenAdUnitId = (): string => {
  const googleAds = getGoogleMobileAds();
  const defaultTestId =
    googleAds?.TestIds?.APP_OPEN ||
    (Platform.OS === 'ios' ? ADMOB_TEST_IDS.IOS_APP_OPEN : ADMOB_TEST_IDS.ANDROID_APP_OPEN);

  if (__DEV__) {
    return defaultTestId;
  }

  const productionId = process.env.EXPO_PUBLIC_ADMOB_APP_OPEN_ID;
  if (productionId && productionId.trim().length > 0) {
    return productionId.trim();
  }

  return defaultTestId;
};

/**
 * Resolves the Interstitial Ad Unit ID.
 */
export const getInterstitialAdUnitId = (): string => {
  const googleAds = getGoogleMobileAds();
  const defaultTestId =
    googleAds?.TestIds?.INTERSTITIAL ||
    (Platform.OS === 'ios' ? ADMOB_TEST_IDS.IOS_INTERSTITIAL : ADMOB_TEST_IDS.ANDROID_INTERSTITIAL);

  if (__DEV__) {
    return defaultTestId;
  }

  const productionId = process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID;
  if (productionId && productionId.trim().length > 0) {
    return productionId.trim();
  }

  return defaultTestId;
};

/**
 * Request configuration for non-personalized ads or specific targeting
 */
export const AD_REQUEST_OPTIONS = {
  requestNonPersonalizedAdsOnly: false,
};

/**
 * Banner ad sizes enum mirror so callers don't need to import from native module
 */
export const BannerAdSize = {
  ANCHORED_ADAPTIVE_BANNER: 'ANCHORED_ADAPTIVE_BANNER',
  BANNER: 'BANNER',
  FULL_BANNER: 'FULL_BANNER',
  LARGE_BANNER: 'LARGE_BANNER',
  LEADERBOARD: 'LEADERBOARD',
  MEDIUM_RECTANGLE: 'MEDIUM_RECTANGLE',
} as const;

export type BannerAdSizeType = (typeof BannerAdSize)[keyof typeof BannerAdSize] | string;

/**
 * Checks whether native Google Mobile Ads binary is compiled into this app.
 * In standard Expo Go or Web, native modules are not linked.
 */
export const isNativeAdMobAvailable = (): boolean => {
  try {
    if (isExpoGo()) return false;

    // Check if the native module is actually registered in the binary
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { TurboModuleRegistry, NativeModules } = require('react-native');
    if (TurboModuleRegistry && typeof TurboModuleRegistry.get === 'function') {
      const turbo = TurboModuleRegistry.get('RNGoogleMobileAdsModule');
      if (turbo != null) return true;
    }
    return !!NativeModules?.RNGoogleMobileAdsModule;
  } catch {
    return false;
  }
};

/**
 * Safely loads react-native-google-mobile-ads ONLY when the native module is actually present.
 * Returns null in Expo Go / Web / simulator without native binary.
 */
export const getGoogleMobileAds = (): any => {
  try {
    if (!isNativeAdMobAvailable()) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
};
