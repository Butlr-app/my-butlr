import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import SignatureScreen, {
  type SignatureViewRef,
} from 'react-native-signature-canvas';

import {
  AppText,
  Card,
  InfoBanner,
  LoadingScreen,
  PageHeader,
  PrimaryButton,
  Screen,
  TextField,
} from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useGuestSession } from '@/context/GuestSessionContext';
import { validateCheckin, type CheckinErrors } from '@/lib/checkinValidation';
import { getGuestCheckin, submitGuestCheckin } from '@/lib/guestApi';
import { translate } from '@/lib/i18n';
import type {
  GuestCheckin,
  GuestCheckinInput,
  IdDocumentType,
} from '@/types/guest';

const signatureWebStyle = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; margin: 0; }
  body, html { width: 100%; height: 100%; background: #fff; }
`;

export default function CheckinScreen() {
  const { token, portal, language } = useGuestSession();
  const signatureRef = useRef<SignatureViewRef>(null);
  const [existing, setExisting] = useState<GuestCheckin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [signatureStarted, setSignatureStarted] = useState(false);
  const [errors, setErrors] = useState<CheckinErrors>({});
  const [form, setForm] = useState({
    guestName: portal?.reservation.guest_name ?? '',
    guestEmail: portal?.reservation.guest_email ?? '',
    guestPhone: portal?.reservation.guest_phone ?? '',
    address: '',
    nationality: '',
    idDocType: 'passport' as IdDocumentType,
    idDocNumber: '',
    numGuests: portal?.reservation.guests_count ?? 1,
    estimatedArrival: '',
    specialRequests: '',
    rulesAccepted: false,
  });

  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const genericError = translate(language, 'genericError');

  useEffect(() => {
    let cancelled = false;
    if (!token) return;
    getGuestCheckin(token)
      .then((checkin) => {
        if (cancelled) return;
        setExisting(checkin);
        if (checkin && checkin.status !== 'completed') {
          setForm({
            guestName: checkin.guest_name,
            guestEmail: checkin.guest_email ?? '',
            guestPhone: checkin.guest_phone ?? '',
            address: checkin.address ?? '',
            nationality: checkin.nationality ?? '',
            idDocType: checkin.id_doc_type,
            idDocNumber: checkin.id_doc_number ?? '',
            numGuests: checkin.num_guests,
            estimatedArrival: checkin.estimated_arrival ?? '',
            specialRequests: checkin.special_requests ?? '',
            rulesAccepted: checkin.rules_accepted,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(genericError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [genericError, token]);

  if (!portal || !token) return null;
  if (loading) return <LoadingScreen />;

  if (existing?.status === 'completed') {
    return (
      <Screen>
        <PageHeader eyebrow={portal.reservation.property_name} title={t('checkinComplete')} />
        <InfoBanner message={t('checkinCompleteBody')} tone="success" />
        <Card style={styles.completedCard}>
          <Detail label={t('fullName')} value={existing.guest_name} />
          <Detail label={t('arrivalTime')} value={existing.estimated_arrival || '—'} />
          <Detail
            label={t('documentType')}
            value={`${existing.id_doc_type.replaceAll('_', ' ')} · ${existing.id_doc_number || '—'}`}
          />
          <Detail label={t('guestCount')} value={String(existing.num_guests)} />
          {existing.signature_data ? (
            <View style={styles.completedSignature}>
              <AppText variant="eyebrow">{t('signature')}</AppText>
              <Image
                source={{ uri: existing.signature_data }}
                contentFit="contain"
                style={styles.signatureImage}
                accessibilityLabel={t('signature')}
              />
            </View>
          ) : null}
        </Card>
      </Screen>
    );
  }

  const inputWithSignature = (signatureData: string): GuestCheckinInput => ({
    ...form,
    signatureData,
  });

  const submit = () => {
    const validation = validateCheckin(inputWithSignature(signatureStarted ? 'pending' : ''));
    setErrors(validation);
    if (Object.keys(validation).length) return;
    signatureRef.current?.readSignature();
  };

  const completeSubmission = async (signatureData: string) => {
    const input = inputWithSignature(signatureData);
    const validation = validateCheckin(input);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setSaving(true);
    setLoadError('');
    try {
      const checkin = await submitGuestCheckin(token, input);
      setExisting(checkin);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setLoadError(t('genericError'));
    } finally {
      setSaving(false);
    }
  };

  const errorText = (field: keyof CheckinErrors) =>
    errors[field]
      ? errors[field] === 'required'
        ? t('required')
        : t('genericError')
      : undefined;

  const documentOptions: Array<{ value: IdDocumentType; label: string }> = [
    { value: 'passport', label: t('passport') },
    { value: 'id_card', label: t('idCard') },
    { value: 'driver_license', label: t('driverLicense') },
  ];

  return (
    <Screen>
      <PageHeader
        eyebrow={portal.reservation.property_name}
        title={t('checkin')}
        subtitle={
          language === 'fr'
            ? 'Préparez votre arrivée en toute sécurité.'
            : 'Prepare your arrival securely.'
        }
      />
      {loadError ? <InfoBanner message={loadError} /> : null}

      <TextField
        label={`${t('fullName')} *`}
        value={form.guestName}
        onChangeText={(guestName) => setForm((value) => ({ ...value, guestName }))}
        autoComplete="name"
        error={errorText('guestName')}
      />
      <TextField
        label={t('email')}
        value={form.guestEmail}
        onChangeText={(guestEmail) => setForm((value) => ({ ...value, guestEmail }))}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label={t('phone')}
        value={form.guestPhone}
        onChangeText={(guestPhone) => setForm((value) => ({ ...value, guestPhone }))}
        keyboardType="phone-pad"
        autoComplete="tel"
      />
      <TextField
        label={t('nationality')}
        value={form.nationality}
        onChangeText={(nationality) => setForm((value) => ({ ...value, nationality }))}
      />
      <TextField
        label={t('address')}
        value={form.address}
        onChangeText={(address) => setForm((value) => ({ ...value, address }))}
        autoComplete="street-address"
      />

      <View style={styles.optionGroup}>
        <AppText variant="bodyMedium">{t('documentType')}</AppText>
        <View style={styles.options}>
          {documentOptions.map((option) => {
            const selected = form.idDocType === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() =>
                  setForm((value) => ({ ...value, idDocType: option.value }))
                }
                style={({ pressed }) => [
                  styles.option,
                  selected && styles.optionSelected,
                  pressed && styles.pressed,
                ]}>
                <AppText
                  variant="caption"
                  style={selected ? styles.optionTextSelected : styles.optionText}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextField
        label={`${t('documentNumber')} *`}
        value={form.idDocNumber}
        onChangeText={(idDocNumber) => setForm((value) => ({ ...value, idDocNumber }))}
        autoCapitalize="characters"
        error={errorText('idDocNumber')}
      />
      <TextField
        label={`${t('guestCount')} *`}
        value={String(form.numGuests)}
        onChangeText={(value) =>
          setForm((current) => ({ ...current, numGuests: Number(value) || 0 }))
        }
        keyboardType="number-pad"
        error={errorText('numGuests')}
      />
      <TextField
        label={`${t('arrivalTime')} *`}
        value={form.estimatedArrival}
        onChangeText={(estimatedArrival) =>
          setForm((value) => ({ ...value, estimatedArrival }))
        }
        placeholder="15:00"
        keyboardType="numbers-and-punctuation"
        maxLength={5}
        error={errorText('estimatedArrival')}
      />
      <TextField
        label={t('specialRequests')}
        value={form.specialRequests}
        onChangeText={(specialRequests) =>
          setForm((value) => ({ ...value, specialRequests }))
        }
        multiline
        maxLength={2000}
      />

      <View style={styles.signatureGroup}>
        <View style={styles.signatureHeader}>
          <AppText variant="bodyMedium">{t('signature')} *</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('clear')}
            onPress={() => {
              signatureRef.current?.clearSignature();
              setSignatureStarted(false);
            }}
            style={styles.clearButton}>
            <AppText variant="caption" style={styles.clearText}>
              {t('clear')}
            </AppText>
          </Pressable>
        </View>
        <View style={[styles.signature, errors.signatureData && styles.signatureError]}>
          <SignatureScreen
            ref={signatureRef}
            onBegin={() => {
              setSignatureStarted(true);
              setErrors((value) => ({ ...value, signatureData: undefined }));
            }}
            onOK={completeSubmission}
            onEmpty={() =>
              setErrors((value) => ({ ...value, signatureData: 'required' }))
            }
            autoClear={false}
            descriptionText=""
            clearText=""
            confirmText=""
            webStyle={signatureWebStyle}
            penColor={colors.navy}
            backgroundColor={colors.white}
          />
        </View>
        {errors.signatureData ? (
          <AppText style={styles.errorText}>{t('signatureRequired')}</AppText>
        ) : null}
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: form.rulesAccepted }}
        onPress={() =>
          setForm((value) => ({ ...value, rulesAccepted: !value.rulesAccepted }))
        }
        style={styles.checkboxRow}>
        <View style={[styles.checkbox, form.rulesAccepted && styles.checkboxChecked]}>
          {form.rulesAccepted ? (
            <Ionicons name="checkmark" size={18} color={colors.white} />
          ) : null}
        </View>
        <AppText style={styles.checkboxText}>{t('rulesAccept')}</AppText>
      </Pressable>
      {errors.rulesAccepted ? (
        <AppText style={styles.errorText}>{t('rulesRequired')}</AppText>
      ) : null}

      <PrimaryButton label={t('submitCheckin')} loading={saving} onPress={submit} />
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <AppText variant="eyebrow">{label}</AppText>
      <AppText variant="bodyMedium">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  completedCard: { gap: spacing.md },
  completedSignature: {
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  signatureImage: {
    width: '100%',
    height: 140,
    borderRadius: radius.sm,
    backgroundColor: colors.white,
  },
  detail: { gap: spacing.xs },
  optionGroup: { gap: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  optionSelected: { backgroundColor: colors.navy, borderColor: colors.navy },
  optionText: { color: colors.text },
  optionTextSelected: { color: colors.white, fontFamily: fonts.bodyMedium },
  signatureGroup: { gap: spacing.sm },
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  clearText: { color: colors.gold, fontFamily: fonts.bodyMedium },
  signature: {
    height: 190,
    overflow: 'hidden',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  signatureError: { borderColor: colors.error },
  checkboxRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.navy, borderColor: colors.navy },
  checkboxText: { flex: 1, fontSize: 14, lineHeight: 21 },
  errorText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  pressed: { opacity: 0.72 },
});
