import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Card,
  PageHeader,
  PrimaryButton,
  Screen,
  SectionTitle,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useGuestSession } from '@/context/GuestSessionContext';
import { formatStayDate } from '@/lib/stayPhase';
import { translate } from '@/lib/i18n';

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={19} color={colors.gold} />
      </View>
      <View style={styles.detailCopy}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="bodyMedium">{value || '—'}</AppText>
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { portal, language, signOut } = useGuestSession();
  if (!portal) return null;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const { reservation } = portal;

  const confirmSignOut = () => {
    Alert.alert(t('signOut'), t('signOutHint'), [
      { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
      {
        text: language === 'fr' ? 'Retirer' : 'Remove',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/activate');
        },
      },
    ]);
  };

  return (
    <Screen>
      <PageHeader eyebrow={reservation.property_name} title={t('profile')} />

      <Card style={styles.identity}>
        <View style={styles.avatar}>
          <AppText variant="title" style={styles.avatarText}>
            {reservation.guest_name
              .split(/\s+/)
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </AppText>
        </View>
        <View style={styles.identityCopy}>
          <AppText variant="title">{reservation.guest_name}</AppText>
          <AppText variant="caption">{reservation.property_name}</AppText>
        </View>
      </Card>

      <SectionTitle title={t('stayDetails')} />
      <Card style={styles.details}>
        <DetailRow
          icon="calendar-outline"
          label={t('arrival')}
          value={formatStayDate(reservation.arrival, language)}
        />
        <View style={styles.divider} />
        <DetailRow
          icon="calendar-clear-outline"
          label={t('departure')}
          value={formatStayDate(reservation.departure, language)}
        />
        <View style={styles.divider} />
        <DetailRow
          icon="people-outline"
          label={t('guests')}
          value={String(reservation.guests_count)}
        />
      </Card>

      <SectionTitle title={t('support')} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('messages')}
        onPress={() => router.push('/(tabs)/messages')}
        style={({ pressed }) => [styles.supportCard, pressed && styles.pressed]}>
          <View style={styles.supportIcon}>
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.gold} />
          </View>
          <View style={styles.supportCopy}>
            <AppText variant="bodyMedium">{t('contact')}</AppText>
            <AppText variant="caption">{t('supportBody')}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={21} color={colors.textMuted} />
      </Pressable>

      <View style={styles.signOut}>
        <PrimaryButton label={t('signOut')} variant="danger" onPress={confirmSignOut} />
        <AppText variant="caption" style={styles.signOutHint}>
          {t('signOutHint')}
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  avatarText: { color: colors.goldLight },
  identityCopy: { flex: 1, gap: 2 },
  details: { gap: spacing.md },
  detailRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCopy: { flex: 1, gap: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  supportCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  supportIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.creamDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportCopy: { flex: 1, gap: 2 },
  signOut: { gap: spacing.sm, marginTop: spacing.lg },
  signOutHint: { textAlign: 'center' },
  pressed: { opacity: 0.75 },
});
