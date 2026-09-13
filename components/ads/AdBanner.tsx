import React, { useState } from 'react';
import { StyleSheet, View, Text, ViewStyle, StyleProp } from 'react-native';
import {
  getBannerAdUnitId,
  AD_REQUEST_OPTIONS,
  isNativeAdMobAvailable,
  getGoogleMobileAds,
  BannerAdSize,
} from '../../constants/AdsConfig';

interface AdBannerProps {
  style?: StyleProp<ViewStyle>;
  adUnitId?: string;
  size?: string;
  /**
   * Whether to show a dev banner badge in Expo Go / Web mode.
   * Default is true in development.
   */
  showDevPlaceholder?: boolean;
}

/**
 * AdBanner - Non-intrusive Google AdMob Banner Component
 *
 * Features:
 * - Adapts to screen width automatically using ANCHORED_ADAPTIVE_BANNER
 * - Non-intrusive: sits docked at the bottom of the screen or above tab bars
 * - Auto-collapses cleanly to 0 height if no ad fill or when offline
 * - 100% resilient fallback in Expo Go / Web so development is never disrupted
 * - Zero static import of native modules: prevents Invariant Violation crashes in Expo Go
 */
export const AdBanner: React.FC<AdBannerProps> = ({
  style,
  adUnitId,
  size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER,
  showDevPlaceholder = __DEV__,
}) => {
  const [adError, setAdError] = useState(false);

  // Fallback for Expo Go, Web, or simulators without native AdMob module compiled
  if (!isNativeAdMobAvailable()) {
    if (!showDevPlaceholder) {
      return null;
    }

    return (
      <View style={[styles.devContainer, style]}>
        <View style={styles.devBadge}>
          <Text style={styles.devText}>AdMob Banner (Dev Mode)</Text>
          <Text style={styles.devSubText}>Active in standalone / EAS native build</Text>
        </View>
      </View>
    );
  }

  // Load native module dynamically only when available
  const googleAds = getGoogleMobileAds();
  if (!googleAds || !googleAds.BannerAd) {
    return null;
  }

  // If the ad failed to load, collapse to 0 height so no blank box remains
  if (adError) {
    return null;
  }

  const { BannerAd } = googleAds;
  const isAdaptive =
    size === BannerAdSize.ANCHORED_ADAPTIVE_BANNER ||
    size === BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER ||
    size === BannerAdSize.INLINE_ADAPTIVE_BANNER;
  const unitId = adUnitId || getBannerAdUnitId(isAdaptive);
  const actualSize = unitId.includes('6300978111') ? BannerAdSize.BANNER : size;

  return (
    <View style={[styles.container, style]}>
      <BannerAd
        unitId={unitId}
        size={actualSize}
        requestOptions={AD_REQUEST_OPTIONS}
        onAdLoaded={() => {
          setAdError(false);
        }}
        onAdFailedToLoad={(error: any) => {
          console.warn('[AdMob] Banner ad failed to load:', error);
          setAdError(true);
        }}
      />
    </View>
  );
};

export default AdBanner;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#192633',
    width: '100%',
    overflow: 'hidden',
  },
  devContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#131e2b',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2b3c4f',
    width: '100%',
  },
  devBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(30, 144, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(30, 144, 255, 0.4)',
    alignItems: 'center',
  },
  devText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e90ff',
    letterSpacing: 0.5,
  },
  devSubText: {
    fontSize: 9,
    color: '#8ca3ba',
    marginTop: 1,
  },
});
