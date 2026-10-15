import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { url } from '../constants/EnvValue';

const VERSION_CACHE_KEY = '@workpay:cached_version_policy';

export interface AppVersionPolicy {
  platform: string;
  clientVersionCode: number;
  latestVersionCode: number;
  minimumSupportedVersionCode: number;
  updateRequired: boolean;
  updateAvailable: boolean;
  storeUrl: string;
  marketUrl?: string;
  title: string;
  message: string;
}

export interface VersionCheckResult {
  required: boolean;
  available: boolean;
  policy: AppVersionPolicy | null;
  error?: boolean;
}

/**
 * Retrieves the current numeric version code for the running binary.
 * In Android: versionCode (e.g. 16)
 * In iOS: buildNumber (e.g. 16)
 */
export const getAppVersionCode = (): number => {
  if (Platform.OS === 'android') {
    return Constants.expoConfig?.android?.versionCode || 18;
  }
  const iosBuild = Constants.expoConfig?.ios?.buildNumber;
  return iosBuild ? parseInt(iosBuild, 10) : 18;
};

/**
 * Checks whether an update is required by querying the backend policy.
 * Implements a fail-safe offline cache: if the network check fails, it consults
 * the last known cached policy rather than blocking the employee at the office door.
 */
export const checkAppVersionPolicy = async (): Promise<VersionCheckResult> => {
  const versionCode = getAppVersionCode();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const endpoint = `${url}/api/app-version?platform=${Platform.OS}&versionCode=${versionCode}`;
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const policy: AppVersionPolicy = await response.json();
      // Cache latest policy for offline resilience
      await AsyncStorage.setItem(VERSION_CACHE_KEY, JSON.stringify(policy));

      return {
        required: !!policy.updateRequired,
        available: !!policy.updateAvailable,
        policy,
      };
    }
  } catch (error) {
    console.warn('[AppVersionService] Network check failed, reading cached policy:', error);
  }

  // Fallback: Read cached policy if network is unreachable
  try {
    const cachedRaw = await AsyncStorage.getItem(VERSION_CACHE_KEY);
    if (cachedRaw) {
      const cachedPolicy: AppVersionPolicy = JSON.parse(cachedRaw);
      const isOutdated = versionCode < cachedPolicy.minimumSupportedVersionCode;
      return {
        required: isOutdated,
        available: versionCode < cachedPolicy.latestVersionCode,
        policy: cachedPolicy,
        error: true,
      };
    }
  } catch (cacheErr) {
    console.warn('[AppVersionService] Cache read error:', cacheErr);
  }

  // Fail-open default: if server is down and no cached policy exists, allow attendance usage
  return {
    required: false,
    available: false,
    policy: null,
    error: true,
  };
};

/**
 * Launches the native Google Play Store app listing via market:// deep link,
 * falling back to the standard web URL if Google Play Store app is not installed.
 */
export const openStoreForUpdate = async (policy?: AppVersionPolicy | null): Promise<void> => {
  const marketUrl =
    policy?.marketUrl || 'market://details?id=com.chiranjeebnayak.workPayApp';
  const webUrl =
    policy?.storeUrl ||
    'https://play.google.com/store/apps/details?id=com.chiranjeebnayak.workPayApp';

  try {
    const supported = await Linking.canOpenURL(marketUrl);
    if (supported) {
      await Linking.openURL(marketUrl);
      return;
    }
  } catch {
    // Ignore market scheme check error and fall through to webUrl
  }

  try {
    await Linking.openURL(webUrl);
  } catch (err) {
    console.warn('[AppVersionService] Failed to open store URL:', err);
  }
};
