import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, InfoBanner, PrimaryButton, TextField } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useGuestSession } from '@/context/GuestSessionContext';
import { GuestApiError } from '@/lib/guestApi';
import { translate } from '@/lib/i18n';
import { extractInvitationToken } from '@/lib/invitation';

export default function ActivateScreen() {
  const router = useRouter();
  const { activate, activating, bootstrapError } = useGuestSession();
  const language = 'fr' as const;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const [invitation, setInvitation] = useState('');
  const [error, setError] = useState('');

  const paste = async () => {
    const text = await Clipboard.getStringAsync();
    setInvitation(text);
    setError('');
  };

  const submit = async () => {
    if (!extractInvitationToken(invitation)) {
      setError(t('invalidInvitation'));
      return;
    }
    setError('');
    try {
      await activate(invitation);
      router.replace('/(tabs)');
    } catch (cause) {
      setError(
        cause instanceof GuestApiError &&
          ['not_found', 'invalid_portal'].includes(cause.code)
          ? t('unavailable')
          : t('genericError'),
      );
    }
  };

  return (
    <LinearGradient colors={[colors.navy, '#102B45']} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <View style={styles.brand}>
              <View style={styles.monogram}>
                <AppText variant="title" style={styles.monogramText}>
                  MB
                </AppText>
              </View>
              <AppText variant="title" style={styles.brandName}>
                My Butlr
              </AppText>
              <AppText variant="eyebrow" style={styles.brandEyebrow}>
                Guest
              </AppText>
            </View>

            <View style={styles.card}>
              <AppText variant="display">{t('activateTitle')}</AppText>
              <AppText style={styles.intro}>{t('activateBody')}</AppText>

              {bootstrapError ? <InfoBanner message={t('unavailable')} tone="warning" /> : null}
              {error ? <InfoBanner message={error} /> : null}

              <View style={styles.inputRow}>
                <View style={styles.inputFlex}>
                  <TextField
                    label={t('invitationLabel')}
                    placeholder={t('invitationPlaceholder')}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={invitation}
                    onChangeText={(value) => {
                      setInvitation(value);
                      setError('');
                    }}
                    returnKeyType="go"
                    onSubmitEditing={submit}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('paste')}
                  onPress={paste}
                  style={({ pressed }) => [styles.pasteButton, pressed && styles.pressed]}>
                  <Ionicons name="clipboard-outline" size={20} color={colors.navy} />
                  <AppText variant="caption" style={styles.pasteText}>
                    {t('paste')}
                  </AppText>
                </Pressable>
              </View>

              <PrimaryButton
                label={t('continue')}
                icon="arrow-forward"
                loading={activating}
                disabled={!invitation.trim()}
                onPress={submit}
              />

              <View style={styles.security}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.gold} />
                <AppText variant="caption" style={styles.securityText}>
                  Votre invitation reste chiffrée dans le trousseau sécurisé de cet appareil.
                </AppText>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  brand: { alignItems: 'center' },
  monogram: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.goldLight,
    marginBottom: spacing.md,
  },
  monogramText: { color: colors.goldLight },
  brandName: { color: colors.white, fontSize: 30 },
  brandEyebrow: { color: colors.goldLight, marginTop: spacing.xs },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.cream,
    padding: spacing.lg,
    gap: spacing.md,
  },
  intro: { color: colors.textMuted, marginBottom: spacing.sm },
  inputRow: { gap: spacing.sm },
  inputFlex: { flex: 1 },
  pasteButton: {
    alignSelf: 'flex-end',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.creamDeep,
  },
  pasteText: { color: colors.navy, fontFamily: fonts.bodyMedium },
  pressed: { opacity: 0.7 },
  security: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  securityText: { flex: 1 },
});
