import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  InfoBanner,
  PageHeader,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useGuestSession } from '@/context/GuestSessionContext';
import { richContentToText } from '@/lib/content';
import { translate } from '@/lib/i18n';
import { getStayPhase } from '@/lib/stayPhase';

function DetailSection({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card style={styles.sectionCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={title}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => [styles.sectionHeader, pressed && styles.pressed]}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={21} color={colors.gold} />
        </View>
        <AppText variant="bodyMedium" style={styles.sectionTitleText}>
          {title}
        </AppText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>
      {expanded ? (
        <AppText style={styles.sectionBody}>{body || '—'}</AppText>
      ) : null}
    </Card>
  );
}

export default function StayScreen() {
  const router = useRouter();
  const { portal, language } = useGuestSession();
  const [copied, setCopied] = useState(false);
  if (!portal) return null;

  const { reservation, settings, guides } = portal;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const phase = getStayPhase(reservation.arrival, reservation.departure);

  const copyWifi = async () => {
    if (!settings.wifi_password) return;
    await Clipboard.setStringAsync(settings.wifi_password);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const arrivalInstructions = richContentToText(settings.check_in_instructions);
  const departureInstructions = richContentToText(settings.check_out_instructions);
  const rules = richContentToText(settings.house_rules);

  return (
    <Screen>
      <PageHeader
        eyebrow={reservation.property_name}
        title={t('stayDetails')}
        subtitle={`${reservation.guests_count} ${t('guests')}`}
      />

      {settings.wifi_name || settings.wifi_password ? (
        <Card style={styles.wifiCard}>
          <View style={styles.wifiIcon}>
            <Ionicons name="wifi" size={25} color={colors.goldLight} />
          </View>
          <View style={styles.wifiCopy}>
            <AppText variant="eyebrow" style={styles.wifiEyebrow}>
              {t('wifi')}
            </AppText>
            <AppText variant="bodyMedium" style={styles.wifiText}>
              {settings.wifi_name || 'Wi-Fi'}
            </AppText>
            {settings.wifi_password ? (
              <AppText style={styles.wifiPassword}>{settings.wifi_password}</AppText>
            ) : null}
          </View>
          {settings.wifi_password ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Copier le mot de passe Wi-Fi"
              onPress={copyWifi}
              style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={20}
                color={colors.goldLight}
              />
            </Pressable>
          ) : null}
        </Card>
      ) : (
        <InfoBanner message={t('noContent')} tone="warning" />
      )}

      {settings.require_online_checkin && phase !== 'after' ? (
        <PrimaryButton
          label={t('completeCheckin')}
          icon="shield-checkmark-outline"
          onPress={() => router.push('/check-in')}
        />
      ) : null}

      <SectionTitle title={t('access')} />
      {arrivalInstructions ? (
        <DetailSection
          icon="key-outline"
          title={t('checkinInstructions')}
          body={arrivalInstructions}
        />
      ) : null}
      {departureInstructions ? (
        <DetailSection
          icon="exit-outline"
          title={t('checkoutInstructions')}
          body={departureInstructions}
        />
      ) : null}
      {rules ? (
        <DetailSection icon="document-text-outline" title={t('houseRules')} body={rules} />
      ) : null}

      {guides.length ? <SectionTitle title={t('guides')} /> : null}
      {guides.map((guide) => (
        <DetailSection
          key={guide.id}
          icon="book-outline"
          title={guide.title}
          body={richContentToText(guide.content) || t('noContent')}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  wifiCard: {
    backgroundColor: colors.navy,
    borderColor: colors.navySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  wifiIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  wifiCopy: { flex: 1, gap: 2 },
  wifiEyebrow: { color: colors.goldLight },
  wifiText: { color: colors.white },
  wifiPassword: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  copyButton: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sectionCard: { padding: 0, overflow: 'hidden' },
  sectionHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleText: { flex: 1 },
  sectionBody: {
    color: colors.textMuted,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  pressed: { opacity: 0.72 },
});
