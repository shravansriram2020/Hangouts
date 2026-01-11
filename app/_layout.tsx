import React, { useEffect, useCallback, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { AuthProvider } from '../context/AuthContext';
import { Stack, useRouter } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// Font scaling is disabled globally in index.js before any components render
// This ensures text size is locked regardless of device accessibility settings

function RootLayoutNav() {
  const router = useRouter();
  const handledUrls = useRef<Set<string>>(new Set());

  // Extract event ID from various URL formats and navigate
  const handleDeepLink = useCallback((url: string) => {
    // Prevent duplicate handling of the same URL
    if (handledUrls.current.has(url)) {
      console.log('[Deep Link] Already handled:', url);
      return;
    }
    handledUrls.current.add(url);
    
    // Clear old URLs after 5 seconds to allow re-navigation
    setTimeout(() => {
      handledUrls.current.delete(url);
    }, 5000);

    console.log('[Deep Link] Processing:', url);
    const parsed = Linking.parse(url);
    console.log('[Deep Link] Parsed:', parsed);

    let eventId: string | null = null;

    // Handle Universal Links: https://api.hangouts-app.com/share/:id
    // Handle Universal Links: https://api.hangouts-app.com/event/:id
    // Handle Universal Links: https://api.hangouts-app.com/invite/:id
    if (parsed.path?.startsWith('share/')) {
      eventId = parsed.path.replace('share/', '').split('/')[0];
    } else if (parsed.path?.startsWith('event/')) {
      eventId = parsed.path.replace('event/', '').split('/')[0];
    } else if (parsed.path?.startsWith('invite/')) {
      eventId = parsed.path.replace('invite/', '').split('/')[0];
    }
    
    // Handle custom scheme: hangouts://event/:id (from Dynamic Island, notifications, etc.)
    if (!eventId && parsed.hostname === 'event' && parsed.path) {
      eventId = parsed.path.replace(/^\//, '').split('/')[0];
    }
    
    // Handle: hangouts://share/:id or hangouts://invite/:id
    if (!eventId && (parsed.hostname === 'share' || parsed.hostname === 'invite') && parsed.path) {
      eventId = parsed.path.replace(/^\//, '').split('/')[0];
    }

    // Also check if the path itself contains the ID (hangouts:///event/abc123)
    if (!eventId && parsed.path) {
      const pathMatch = parsed.path.match(/(?:event|share|invite)\/([a-f0-9-]+)/i);
      if (pathMatch) {
        eventId = pathMatch[1];
      }
    }

    if (eventId) {
      console.log('[Deep Link] Navigating to event:', eventId);
      // Use replace to avoid stacking navigation
      setTimeout(() => {
        router.push(`/event/${eventId}`);
      }, 100);
    } else {
      console.log('[Deep Link] No event ID found in URL');
    }
  }, [router]);

  // Handle cold start URL (app was not running)
  useEffect(() => {
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('[Deep Link] Initial URL (cold start):', initialUrl);
        handleDeepLink(initialUrl);
      }
    };
    getInitialURL();
  }, [handleDeepLink]);

  // Handle warm start URLs (app is already running in background)
  useEffect(() => {
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[Deep Link] URL event (warm start):', event.url);
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Agrandir-Tight': require('../assets/fonts/Agrandir-Tight.otf'),
    'Agrandir-TextBold': require('../assets/fonts/Agrandir-TextBold.otf'),
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
