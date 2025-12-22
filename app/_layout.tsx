import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput } from 'react-native';
import { useFonts, Prompt_400Regular, Prompt_500Medium, Prompt_600SemiBold, Prompt_700Bold } from '@expo-google-fonts/prompt';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '../context/AuthContext';
import { Stack } from 'expo-router';

SplashScreen.preventAutoHideAsync();

// Disable font scaling globally to ensure consistent text size regardless of device settings
if ((Text as any).defaultProps == null) {
  (Text as any).defaultProps = {};
}
(Text as any).defaultProps.allowFontScaling = false;

if ((TextInput as any).defaultProps == null) {
  (TextInput as any).defaultProps = {};
}
(TextInput as any).defaultProps.allowFontScaling = false;

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
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
