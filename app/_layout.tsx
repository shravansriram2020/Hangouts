import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Prompt_400Regular, Prompt_500Medium, Prompt_600SemiBold, Prompt_700Bold } from '@expo-google-fonts/prompt';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { AuthProvider } from '../context/AuthContext';
import { Stack, useRouter } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// Font scaling is disabled globally in index.js before any components render
// This ensures text size is locked regardless of device accessibility settings

function RootLayoutNav() {
  const router = useRouter();
  const url = Linking.useURL();

  useEffect(() => {
    if (url) {
      const parsed = Linking.parse(url);
      console.log('[Universal Link] Received:', url, parsed);
      
      // Handle /event/:id links
      if (parsed.path?.startsWith('event/')) {
        const eventId = parsed.path.replace('event/', '').split('/')[0];
        if (eventId) {
          console.log('[Universal Link] Navigating to event:', eventId);
          router.push(`/event/${eventId}`);
        }
      }
      
      // Handle /invite/:id links (same as event for now)
      if (parsed.path?.startsWith('invite/')) {
        const eventId = parsed.path.replace('invite/', '').split('/')[0];
        if (eventId) {
          console.log('[Universal Link] Navigating to invite:', eventId);
          router.push(`/event/${eventId}`);
        }
      }
      
      // Handle /share/:id links (same as event for now)
      if (parsed.path?.startsWith('share/')) {
        const eventId = parsed.path.replace('share/', '').split('/')[0];
        if (eventId) {
          console.log('[Universal Link] Navigating to share:', eventId);
          router.push(`/event/${eventId}`);
        }
      }
    }
  }, [url, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Prompt-Regular': Prompt_400Regular,
    'Prompt-Medium': Prompt_500Medium,
    'Prompt-SemiBold': Prompt_600SemiBold,
    'Prompt-Bold': Prompt_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootLayoutNav />
    </AuthProvider>
  );
}
