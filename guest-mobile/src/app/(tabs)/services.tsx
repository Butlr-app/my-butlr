import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  Card,
  InfoBanner,
  PageHeader,
  PrimaryButton,
  Screen,
  SectionTitle,
  TextField,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useGuestSession } from '@/context/GuestSessionContext';
import { requestGuestService } from '@/lib/guestApi';
import { translate } from '@/lib/i18n';
import { getStayPhase } from '@/lib/stayPhase';
import type { PropertyService } from '@/types/guest';

function formatPrice(value: number | null | undefined, language: 'fr' | 'en') {
  if (value == null) return null;
  return new Intl.NumberFormat(language === 'fr' ? 'fr-FR' : 'en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ServicesScreen() {
  const { token, portal, language, refreshPortal } = useGuestSession();
  const [selected, setSelected] = useState<PropertyService | null>(null);
  const [requestedDate, setRequestedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  if (!portal || !token) return null;

  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const services = portal.property_services.filter((entry) => entry.enabled !== false);
  const ended = getStayPhase(
    portal.reservation.arrival,
    portal.reservation.departure,
  ) === 'after';
  const unavailable = portal.settings.show_services === false || ended;

  const close = () => {
    setSelected(null);
    setRequestedDate('');
    setNotes('');
    setError('');
  };

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await requestGuestService(token, selected, { requestedDate, notes });
      await refreshPortal();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      close();
      setSuccess(t('requestSent'));
      setTimeout(() => setSuccess(''), 4000);
    } catch {
      setError(t('genericError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Screen>
        <PageHeader
          eyebrow={portal.reservation.property_name}
          title={t('services')}
          subtitle={t('serviceIntro')}
        />
        {success ? <InfoBanner message={success} tone="success" /> : null}
        {unavailable ? (
          <InfoBanner message={t('noServices')} tone="warning" />
        ) : null}

        {portal.service_requests.length ? (
          <>
            <SectionTitle title={language === 'fr' ? 'Mes demandes' : 'My requests'} />
            {portal.service_requests.slice(0, 4).map((request) => (
              <Card key={request.id} style={styles.requestCard}>
                <View style={styles.requestCopy}>
                  <AppText variant="bodyMedium">{request.title}</AppText>
                  {request.requested_date ? (
                    <AppText variant="caption">{request.requested_date}</AppText>
                  ) : null}
                </View>
                <View style={styles.statusPill}>
                  <AppText variant="caption" style={styles.statusText}>
                    {request.status.replaceAll('_', ' ')}
                  </AppText>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {!unavailable ? <SectionTitle title={t('services')} /> : null}
        {!unavailable &&
          services.map((entry) => {
            const price = formatPrice(
              entry.assignment?.custom_price ?? entry.service.starting_price,
              language,
            );
            return (
              <Pressable
                key={entry.assignment?.id ?? entry.service.id}
                accessibilityRole="button"
                accessibilityLabel={`${t('requestService')} ${entry.service.name}`}
                onPress={() => setSelected(entry)}
                style={({ pressed }) => [styles.serviceCard, pressed && styles.pressed]}>
                {entry.service.image_url ? (
                  <Image
                    source={{ uri: entry.service.image_url }}
                    contentFit="cover"
                    style={styles.serviceImage}
                    accessibilityLabel={entry.service.name}
                  />
                ) : (
                  <View style={[styles.serviceImage, styles.imageFallback]}>
                    <Ionicons name="sparkles" size={28} color={colors.gold} />
                  </View>
                )}
                <View style={styles.serviceCopy}>
                  <AppText variant="bodyMedium">{entry.service.name}</AppText>
                  <AppText variant="caption" numberOfLines={2}>
                    {entry.service.description || entry.service.category || t('serviceIntro')}
                  </AppText>
                  <View style={styles.serviceFooter}>
                    <AppText variant="bodyMedium" style={styles.price}>
                      {price || (language === 'fr' ? 'Sur devis' : 'On request')}
                    </AppText>
                    <View style={styles.bookPill}>
                      <AppText variant="caption" style={styles.bookText}>
                        {t('book')}
                      </AppText>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        {!unavailable && !services.length ? (
          <InfoBanner message={t('noServices')} tone="warning" />
        ) : null}
      </Screen>

      <Modal
        visible={Boolean(selected)}
        transparent
        animationType="slide"
        onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer"
            onPress={close}
            style={styles.scrim}
          />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetCopy}>
                <AppText variant="eyebrow">{t('requestService')}</AppText>
                <AppText variant="title">{selected?.service.name}</AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer"
                onPress={close}
                style={styles.closeButton}>
                <Ionicons name="close" size={23} color={colors.navy} />
              </Pressable>
            </View>
            {error ? <InfoBanner message={error} /> : null}
            <TextField
              label={`${t('preferredDate')} (AAAA-MM-JJ)`}
              value={requestedDate}
              onChangeText={setRequestedDate}
              placeholder="2026-08-15"
              keyboardType="numbers-and-punctuation"
            />
            <TextField
              label={t('notes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={1000}
              placeholder={
                language === 'fr'
                  ? 'Horaires, allergies, préférences…'
                  : 'Timing, allergies, preferences…'
              }
            />
            <PrimaryButton label={t('sendRequest')} loading={saving} onPress={submit} />
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  requestCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  requestCopy: { flex: 1, gap: 2 },
  statusPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: { color: colors.warning, textTransform: 'capitalize' },
  serviceCard: {
    minHeight: 136,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.white,
    flexDirection: 'row',
  },
  serviceImage: { width: 124, minHeight: 136 },
  imageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.creamDeep },
  serviceCopy: { flex: 1, padding: 14, gap: 5 },
  serviceFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  price: { flex: 1, color: colors.gold },
  bookPill: {
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bookText: { color: colors.white },
  pressed: { opacity: 0.78 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlay },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.cream,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: colors.border,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sheetCopy: { flex: 1, gap: 2 },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
