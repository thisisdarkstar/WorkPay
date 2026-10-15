import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ViewStyle,
  StyleProp,
  Platform,
} from 'react-native';
import {
  getNativeAdUnitId,
  AD_REQUEST_OPTIONS,
  isNativeAdMobAvailable,
  getGoogleMobileAds,
} from '../../constants/AdsConfig';

interface NativeAdCardProps {
  style?: StyleProp<ViewStyle>;
  adUnitId?: string;
  /**
   * If true, displays the media view (image/video) when available.
   * Defaults to false for cleaner card / list integration.
   */
  showMedia?: boolean;
  /**
   * Whether to display a dev placeholder in Expo Go / Web mode.
   */
  showDevPlaceholder?: boolean;
}

/**
 * NativeAdCard - Google AdMob Native Advanced Ad Component
 *
 * Designed to integrate seamlessly into list views, feeds, and cards
 * while strictly following Google AdMob policies:
 * 1. Prominent "Ad" badge attribution.
 * 2. Unobtrusive dark-themed UI matching WorkPay's design system.
 * 3. Registered native assets for clickable elements (Headline, Icon, CTA).
 * 4. Auto-collapse to 0 height if offline or no inventory fill.
 * 5. Expo Go / Web / Dev safe with zero runtime crashes.
 * 6. Clean native resource release on unmount via .destroy().
 */
export const NativeAdCard: React.FC<NativeAdCardProps> = ({
  style,
  adUnitId,
  showMedia = false,
  showDevPlaceholder = __DEV__,
}) => {
  const [nativeAd, setNativeAd] = useState<any | null>(null);
  const [adError, setAdError] = useState(false);
  const adInstanceRef = useRef<any | null>(null);

  // Fallback for Expo Go, Web, or simulators without native AdMob compiled in
  if (!isNativeAdMobAvailable()) {
    if (!showDevPlaceholder) {
      return null;
    }

    return (
      <View style={[styles.devContainer, style]}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>
        <Text style={styles.devHeadline}>Sponsored Recommendation</Text>
        <Text style={styles.devBody}>
          Native Ad preview (Dev Mode). In production, this displays a customized card matching WorkPay list items.
        </Text>
        <View style={styles.devCta}>
          <Text style={styles.ctaText}>Learn More</Text>
        </View>
      </View>
    );
  }

  const googleAds = getGoogleMobileAds();
  const unitId = adUnitId || getNativeAdUnitId();

  useEffect(() => {
    let isMounted = true;

    async function loadNativeAd() {
      try {
        if (!googleAds || !googleAds.NativeAd) {
          if (isMounted) setAdError(true);
          return;
        }

        // Clean up previous ad if any
        if (adInstanceRef.current) {
          try {
            adInstanceRef.current.destroy();
          } catch {
            // ignore
          }
          adInstanceRef.current = null;
        }

        const ad = await googleAds.NativeAd.createForAdRequest(unitId, AD_REQUEST_OPTIONS);

        if (!isMounted) {
          try {
            ad.destroy();
          } catch {
            // ignore
          }
          return;
        }

        adInstanceRef.current = ad;
        setNativeAd(ad);
        setAdError(false);
      } catch (error) {
        if (isMounted) {
          console.warn('[AdMob Native] Failed to load native ad:', error);
          setAdError(true);
        }
      }
    }

    loadNativeAd();

    return () => {
      isMounted = false;
      if (adInstanceRef.current) {
        try {
          adInstanceRef.current.destroy();
        } catch {
          // ignore
        }
        adInstanceRef.current = null;
      }
    };
  }, [unitId]);

  // If ad failed to load or has no data, collapse completely (no empty gap)
  if (adError || !nativeAd || !googleAds) {
    return null;
  }

  const {
    NativeAdView,
    NativeAsset,
    NativeAssetType,
    NativeMediaView,
  } = googleAds;

  if (!NativeAdView || !NativeAsset || !NativeAssetType) {
    return null;
  }

  const hasMedia = showMedia && nativeAd.mediaContent && nativeAd.mediaContent.aspectRatio > 0;

  return (
    <NativeAdView nativeAd={nativeAd} style={[styles.card, style]}>
      {/* Top Header Row: Ad Badge + Icon + Headline + Advertiser */}
      <View style={styles.headerRow}>
        {nativeAd.icon?.url ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image
              source={{ uri: nativeAd.icon.url }}
              style={styles.adIcon}
              resizeMode="cover"
            />
          </NativeAsset>
        ) : null}

        <View style={styles.headerInfo}>
          <View style={styles.badgeAndAdvertiser}>
            <View style={styles.adBadge}>
              <Text style={styles.adBadgeText}>Ad</Text>
            </View>
            {nativeAd.advertiser ? (
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <Text style={styles.advertiserText} numberOfLines={1}>
                  {nativeAd.advertiser}
                </Text>
              </NativeAsset>
            ) : null}
          </View>

          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>
              {nativeAd.headline}
            </Text>
          </NativeAsset>
        </View>
      </View>

      {/* Ad Body Description */}
      {nativeAd.body ? (
        <NativeAsset assetType={NativeAssetType.BODY}>
          <Text style={styles.bodyText} numberOfLines={2}>
            {nativeAd.body}
          </Text>
        </NativeAsset>
      ) : null}

      {/* Optional Media Preview (images/video) */}
      {hasMedia && NativeMediaView ? (
        <View style={styles.mediaContainer}>
          <NativeMediaView style={styles.mediaView} resizeMode="cover" />
        </View>
      ) : null}

      {/* Footer Row: Star Rating / Price + CTA Button */}
      <View style={styles.footerRow}>
        <View style={styles.metaContainer}>
          {nativeAd.starRating ? (
            <NativeAsset assetType={NativeAssetType.STAR_RATING}>
              <Text style={styles.metaText}>
                ★ {Number(nativeAd.starRating).toFixed(1)}
              </Text>
            </NativeAsset>
          ) : null}
          {nativeAd.price ? (
            <NativeAsset assetType={NativeAssetType.PRICE}>
              <Text style={styles.metaText}>
                {nativeAd.price}
              </Text>
            </NativeAsset>
          ) : null}
        </View>

        {nativeAd.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={styles.ctaButton}>
              <Text style={styles.ctaText}>
                {nativeAd.callToAction}
              </Text>
            </View>
          </NativeAsset>
        ) : null}
      </View>
    </NativeAdView>
  );
};

export default NativeAdCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#192633',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginVertical: 10,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  adIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#243447',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeAndAdvertiser: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  adBadge: {
    backgroundColor: 'rgba(255, 184, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 184, 0, 0.5)',
  },
  adBadgeText: {
    color: '#FFB800',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  advertiserText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  headline: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bodyText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  mediaContainer: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
    backgroundColor: '#131e2b',
  },
  mediaView: {
    width: '100%',
    height: '100%',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
  },
  ctaButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Dev mode placeholder styles
  devContainer: {
    backgroundColor: '#131e2b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b3c4f',
    padding: 14,
    marginVertical: 10,
    marginHorizontal: 16,
  },
  devHeadline: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: 4,
  },
  devBody: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  devCta: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e90ff',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
});
