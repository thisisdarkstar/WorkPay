import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { EmployeeProvider } from "../context/EmployeeContext";
import { OfficeProvider } from "../context/OfficeContext";

import { useEffect } from 'react';
import { isNativeAdMobAvailable, getGoogleMobileAds } from '../constants/AdsConfig';
import { showAppOpenAdOnLaunch } from '../services/AdService';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (isNativeAdMobAvailable()) {
      try {
        const googleAds = getGoogleMobileAds();
        if (googleAds && typeof googleAds.default === 'function') {
          const mobileAdsInstance = googleAds.default();
          mobileAdsInstance
            .setRequestConfiguration({
              testDeviceIdentifiers: ['EMULATOR', '2DD168D16D2F4A17B994FBE9D34CC2B6'],
            })
            .catch((e: any) => console.log('[AdMob] RequestConfig error:', e));

          mobileAdsInstance
            .initialize()
            .then((adapterStatuses: any) => {
              console.log('[AdMob] Initialization complete:', adapterStatuses);
              // Trigger App Open Ad on launch
              showAppOpenAdOnLaunch();
            })
            .catch((err: any) => {
              console.log('[AdMob] Init error:', err);
            });
        }
      } catch (e) {
        console.log('[AdMob] Init exception:', e);
      }
    }
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <EmployeeProvider>
      <OfficeProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPassword" options={{ headerShown: false }} />
        <Stack.Screen name="(employee)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
      </OfficeProvider>
      </EmployeeProvider>
    </ThemeProvider>
  );
}
