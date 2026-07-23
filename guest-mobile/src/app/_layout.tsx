import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { LoadingScreen } from '@/components/ui';
import { GuestSessionProvider, useGuestSession } from '@/context/GuestSessionContext';
import { colors, fonts } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading, token, portal } = useGuestSession();

  if (loading) return <LoadingScreen />;
  const hasSession = Boolean(token && portal);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.white,
        headerTitleStyle: { fontFamily: fonts.bodySemiBold },
        contentStyle: { backgroundColor: colors.cream },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="guest/stay/[token]" options={{ headerShown: false }} />
      <Stack.Protected guard={!hasSession}>
        <Stack.Screen name="activate" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={hasSession}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="check-in"
          options={{ title: 'Check-in', presentation: 'card' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GuestSessionProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </GuestSessionProvider>
    </GestureHandlerRootView>
  );
}
