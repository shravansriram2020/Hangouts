import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';
import Constants from 'expo-constants';
import { Colors, Fonts } from '../../constants/theme';

const isExpoGo = Constants.appOwnership === 'expo';

let NativeAd: any = null;
let NativeAdView: any = null;
let NativeAsset: any = null;
let NativeAssetType: any = null;
let NativeMediaView: any = null;

if (!isExpoGo && Platform.OS === 'ios') {
  try {
    const googleAds = require('react-native-google-mobile-ads');
    NativeAd = googleAds.NativeAd;
    NativeAdView = googleAds.NativeAdView;
    NativeAsset = googleAds.NativeAsset;
    NativeAssetType = googleAds.NativeAssetType;
    NativeMediaView = googleAds.NativeMediaView;
  } catch (e) {
    console.log('[NativeAdCard] Google Ads not available');
  }
}

interface NativeAdCardProps {
  adUnitId: string;
  variant?: 'inline' | 'banner';
}

const NativeAdCard: React.FC<NativeAdCardProps> = ({ adUnitId, variant = 'inline' }) => {
  const [nativeAd, setNativeAd] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!NativeAd) {
      setLoading(false);
      return;
    }

    let mounted = true;
    let adInstance: any = null;

    const loadAd = async () => {
      try {
        adInstance = await NativeAd.createForAdRequest(adUnitId);
        if (mounted) {
          setNativeAd(adInstance);
          setLoading(false);
          console.log('[NativeAdCard] Ad loaded successfully');
        }
      } catch (e) {
        console.log('[NativeAdCard] Failed to load ad:', e);
        if (mounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadAd();

    return () => {
      mounted = false;
      if (adInstance?.destroy) {
        adInstance.destroy();
      }
    };
  }, [adUnitId]);

  if (!NativeAdView || !nativeAd) {
    return (
      <View style={[styles.container, variant === 'banner' ? styles.bannerContainer : styles.inlineContainer]}>
        <Text style={styles.sponsoredLabel}>SPONSORED</Text>
        <View style={variant === 'banner' ? styles.bannerPlaceholder : styles.inlinePlaceholder} />
      </View>
    );
  }

  if (variant === 'banner') {
    return (
      <NativeAdView nativeAd={nativeAd} style={styles.nativeAdView}>
        <View style={styles.bannerContent}>
          <Text style={styles.sponsoredLabel}>SPONSORED</Text>
          <View style={styles.bannerRow}>
            {nativeAd.icon && (
              <NativeAsset assetType={NativeAssetType.ICON}>
                <Image source={{ uri: nativeAd.icon.url }} style={styles.bannerIcon} />
              </NativeAsset>
            )}
            <View style={styles.bannerInfo}>
              {nativeAd.headline && (
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                  <Text style={styles.headline} numberOfLines={1}>{nativeAd.headline}</Text>
                </NativeAsset>
              )}
              {nativeAd.body && (
                <NativeAsset assetType={NativeAssetType.BODY}>
                  <Text style={styles.tagline} numberOfLines={1}>{nativeAd.body}</Text>
                </NativeAsset>
              )}
            </View>
            {nativeAd.callToAction && (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <View style={styles.ctaButton}>
                  <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
                </View>
              </NativeAsset>
            )}
          </View>
        </View>
      </NativeAdView>
    );
  }

  return (
    <NativeAdView nativeAd={nativeAd} style={styles.nativeAdView}>
      <View style={styles.inlineContent}>
        <Text style={styles.sponsoredLabel}>SPONSORED</Text>
        <View style={styles.inlineRow}>
          {nativeAd.icon && (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.inlineIcon} />
            </NativeAsset>
          )}
          <View style={styles.inlineInfo}>
            {nativeAd.headline && (
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Text style={styles.headline} numberOfLines={1}>{nativeAd.headline}</Text>
              </NativeAsset>
            )}
            {nativeAd.body && (
              <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={styles.tagline} numberOfLines={1}>{nativeAd.body}</Text>
              </NativeAsset>
            )}
          </View>
        </View>
        {nativeAd.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={styles.inlineCta}>
              <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
            </View>
          </NativeAsset>
        )}
      </View>
    </NativeAdView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inlineContainer: {
    flex: 1,
    padding: 16,
  },
  bannerContainer: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
  },
  nativeAdView: {
    flex: 1,
  },
  sponsoredLabel: {
    fontSize: 9,
    fontFamily: Fonts.medium,
    color: Colors.black,
    letterSpacing: 1,
    marginBottom: 8,
  },
  inlinePlaceholder: {
    width: '100%',
    height: 80,
    backgroundColor: Colors.grayLight,
    borderRadius: 10,
  },
  bannerPlaceholder: {
    width: '100%',
    height: 50,
    backgroundColor: Colors.grayLight,
    borderRadius: 8,
  },
  inlineContent: {
    flex: 1,
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
  },
  bannerContent: {
    backgroundColor: Colors.white,
    padding: 12,
    borderRadius: 12,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 12,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },
  inlineInfo: {
    flex: 1,
  },
  bannerInfo: {
    flex: 1,
    marginRight: 10,
  },
  headline: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  tagline: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grayMedium,
    marginTop: 2,
  },
  inlineCta: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  ctaText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
  },
});

export default NativeAdCard;
