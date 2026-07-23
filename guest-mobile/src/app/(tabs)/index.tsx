import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  RefreshControl,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Card,
  IconTile,
  InfoBanner,
  SectionTitle,
} from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useGuestSession } from '@/context/GuestSessionContext';
import { formatStayDate, getStayPhase, phaseLabel } from '@/lib/stayPhase';
import { translate } from '@/lib/i18n';

export default function GuestHomeScreen() {
  const router = useRouter();
  const { portal, language, refreshPortal } = useGuestSession();
  const [refreshing, setRefreshing] = useState(false);
  if (!portal) return null;

  const { reservation, settings } = portal;
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const phase = getStayPhase(reservation.arrival, reservation.departure);
  const firstName = reservation.guest_name.trim().split(/\s+/)[0] || 'Guest';

  const refresh = async () => {
    setRefreshing(true);
    try {
      await refreshPortal();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />
        }
        contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {reservation.property_image_url ? (
            <Image
              source={{ uri: reservation.property_image_url }}
              contentFit="cover"
              transition={250}
              style={StyleSheet.absoluteFill}
              accessibilityLabel={reservation.property_name}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.heroFallback]} />
          )}
          <LinearGradient
            colors={['rgba(7,26,47,0.86)', 'rgba(7,26,47,0.08)', 'rgba(7,26,47,0.88)']}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView style={styles.heroSafe} edges={['top']}>
            <View style={styles.brandRow}>
              <View style={styles.brandSpacer} />
              <AppText variant="title" style={styles.brand}>
                My Butlr
              </AppText>
              <View style={styles.brandSpacer} />
            </View>
            <View style={styles.heroCopy}>
              <AppText variant="display" style={styles.greeting}>
                {t('hello')} {firstName}
              </AppText>
              <AppText style={styles.property}>{reservation.property_name}</AppText>
              <View style={styles.phasePill}>
                <Ionicons name="calendar-outline" size={15} color={colors.goldLight} />
                <AppText variant="caption" style={styles.phaseText}>
                  {phaseLabel(phase, language)}
                </AppText>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {!settings.enabled ? (
            <InfoBanner
              tone="warning"
              message="Le portail de cette propriété est actuellement désactivé."
            />
          ) : null}

          <SectionTitle title={t('quickAccess')} />
          <View style={styles.tiles}>
            <IconTile
              icon="wifi-outline"
              label={t('wifi')}
              onPress={() => router.push('/(tabs)/stay')}
            />
            <IconTile
              icon="key-outline"
              label={t('access')}
              onPress={() => router.push('/(tabs)/stay')}
            />
            <IconTile
              icon="chatbubble-outline"
              label={t('messages')}
              onPress={() => router.push('/(tabs)/messages')}
            />
            <IconTile
              icon="sparkles-outline"
              label={t('services')}
              onPress={() => router.push('/(tabs)/services')}
            />
          </View>

          <SectionTitle title={t('today')} />
          <Card style={styles.stayCard}>
            <View style={styles.dateRow}>
              <View style={styles.dateBlock}>
                <AppText variant="eyebrow">{t('arrival')}</AppText>
                <AppText variant="bodyMedium">
                  {formatStayDate(reservation.arrival, language)}
                </AppText>
              </View>
              <View style={styles.dateLine} />
              <View style={styles.dateBlock}>
                <AppText variant="eyebrow">{t('departure')}</AppText>
                <AppText variant="bodyMedium">
                  {formatStayDate(reservation.departure, language)}
                </AppText>
              </View>
            </View>
            <View style={styles.guestsRow}>
              <Ionicons name="people-outline" size={19} color={colors.gold} />
              <AppText variant="caption">
                {reservation.guests_count} {t('guests')}
              </AppText>
            </View>
          </Card>

          {settings.require_online_checkin && phase !== 'after' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('completeCheckin')}
              onPress={() => router.push('/check-in')}
              style={({ pressed }) => [
                styles.checkinCard,
                pressed && styles.checkinCardPressed,
              ]}>
              <View style={styles.checkinIcon}>
                <Ionicons name="shield-checkmark-outline" size={24} color={colors.gold} />
              </View>
              <View style={styles.checkinCopy}>
                <AppText variant="bodyMedium">{t('checkin')}</AppText>
                <AppText variant="caption">
                  Préparez votre arrivée en quelques minutes.
                </AppText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  content: { paddingBottom: 110 },
  hero: { height: 350, backgroundColor: colors.navy },
  heroFallback: { backgroundColor: colors.navySoft },
  heroSafe: { flex: 1, justifyContent: 'space-between' },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  brandSpacer: { width: 44 },
  brand: { color: colors.goldLight, fontSize: 21 },
  heroCopy: { padding: spacing.lg, gap: spacing.xs },
  greeting: { color: colors.white },
  property: {
    color: colors.goldLight,
    fontFamily: fonts.displayItalic,
    fontSize: 22,
    lineHeight: 28,
  },
  phasePill: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(7,26,47,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  phaseText: { color: colors.white },
  body: { paddingHorizontal: spacing.md, gap: spacing.md },
  tiles: { flexDirection: 'row', gap: spacing.sm },
  stayCard: { gap: spacing.md },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateBlock: { flex: 1, gap: spacing.xs },
  dateLine: { width: 1, height: 42, backgroundColor: colors.border, marginHorizontal: 12 },
  guestsRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkinCard: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
  },
  checkinCardPressed: { opacity: 0.75 },
  checkinIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamDeep,
  },
  checkinCopy: { flex: 1, gap: 2 },
});
