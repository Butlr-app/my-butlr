import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { colors, fonts } from '@/constants/theme';
import { useGuestSession } from '@/context/GuestSessionContext';
import { translate } from '@/lib/i18n';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  stay: 'key-outline',
  services: 'sparkles-outline',
  messages: 'chatbubble-ellipses-outline',
  profile: 'person-outline',
};

export default function GuestTabsLayout() {
  const { language } = useGuestSession();
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.goldLight,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarStyle: {
          backgroundColor: colors.navy,
          borderTopWidth: 0,
          minHeight: 68,
          paddingTop: 7,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyMedium,
          fontSize: 11,
        },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons
            name={
              focused
                ? icons[route.name].replace('-outline', '') as keyof typeof Ionicons.glyphMap
                : icons[route.name]
            }
            color={color}
            size={size}
          />
        ),
      })}>
      <Tabs.Screen name="index" options={{ title: t('home') }} />
      <Tabs.Screen name="stay" options={{ title: t('stay') }} />
      <Tabs.Screen name="services" options={{ title: t('services') }} />
      <Tabs.Screen name="messages" options={{ title: t('messages') }} />
      <Tabs.Screen name="profile" options={{ title: t('profile') }} />
    </Tabs>
  );
}
