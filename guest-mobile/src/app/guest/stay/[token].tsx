import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, InfoBanner, PrimaryButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useGuestSession } from '@/context/GuestSessionContext';

export default function InvitationDeepLinkScreen() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  const invitationToken = Array.isArray(token) ? token[0] : token;
  const router = useRouter();
  const { activate } = useGuestSession();
  const attempted = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!invitationToken || attempted.current) return;
    attempted.current = true;
    activate(invitationToken)
      .then(() => router.replace('/(tabs)'))
      .catch(() => setFailed(true));
  }, [activate, invitationToken, router]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <AppText variant="title">My Butlr</AppText>
        {failed ? (
          <>
            <InfoBanner message="Cette invitation est indisponible ou a expiré." />
            <PrimaryButton
              label="Saisir une autre invitation"
              onPress={() => router.replace('/activate')}
            />
          </>
        ) : (
          <AppText style={styles.message}>Ouverture de votre séjour…</AppText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  message: { color: colors.textMuted },
});
