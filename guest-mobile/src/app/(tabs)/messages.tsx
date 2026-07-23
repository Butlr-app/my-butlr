import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, InfoBanner } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useGuestSession } from '@/context/GuestSessionContext';
import {
  getGuestMessages,
  markGuestMessagesRead,
  sendGuestMessage,
} from '@/lib/guestApi';
import { translate } from '@/lib/i18n';
import type { StayMessage, StayMessagingPayload } from '@/types/guest';

export default function MessagesScreen() {
  const { token, portal, language } = useGuestSession();
  const [messaging, setMessaging] = useState<StayMessagingPayload | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<StayMessage>>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);
  const genericError = translate(language, 'genericError');

  const load = useCallback(async () => {
    if (!token || portal?.settings.show_messaging === false) return;
    try {
      const payload = await getGuestMessages(token);
      setMessaging(payload);
      setError('');
      if ((payload.unread_count ?? 0) > 0) await markGuestMessagesRead(token);
    } catch {
      setError(genericError);
    }
  }, [genericError, portal?.settings.show_messaging, token]);

  useFocusEffect(
    useCallback(() => {
      void load();
      let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
        if (AppState.currentState === 'active') void load();
      }, 15_000);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void load();
        if (state !== 'active' && timer) {
          clearInterval(timer);
          timer = null;
        } else if (state === 'active' && !timer) {
          timer = setInterval(() => void load(), 15_000);
        }
      });
      return () => {
        if (timer) clearInterval(timer);
        subscription.remove();
      };
    }, [load]),
  );

  if (!portal || !token) return null;
  const disabled = portal.settings.show_messaging === false || messaging?.enabled === false;

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    try {
      await sendGuestMessage(token, body);
      setDraft('');
      await load();
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setError(t('genericError'));
    } finally {
      setSending(false);
    }
  };

  const contactName =
    messaging?.contact?.full_name ||
    (messaging?.contact?.role === 'house_manager'
      ? language === 'fr'
        ? 'Votre house manager'
        : 'Your house manager'
      : t('contact'));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <AppText variant="bodyMedium" style={styles.avatarText}>
              {contactName.slice(0, 2).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.headerCopy}>
            <AppText variant="bodyMedium">{contactName}</AppText>
            <AppText variant="caption">{portal.reservation.property_name}</AppText>
          </View>
          <View style={styles.onlineDot} />
        </View>

        {error ? (
          <View style={styles.bannerWrap}>
            <InfoBanner message={error} />
          </View>
        ) : null}
        {disabled ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubble-ellipses-outline" size={42} color={colors.border} />
            <AppText variant="title" style={styles.emptyTitle}>
              {t('messages')}
            </AppText>
            <AppText style={styles.emptyBody}>{t('messagingUnavailable')}</AppText>
          </View>
        ) : (
          <>
            <FlatList
              ref={listRef}
              data={messaging?.messages ?? []}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={42}
                    color={colors.border}
                  />
                  <AppText style={styles.emptyBody}>{t('noMessages')}</AppText>
                </View>
              }
              renderItem={({ item }) => {
                const mine = item.sender_type === 'guest';
                return (
                  <View style={[styles.messageRow, mine && styles.messageRowMine]}>
                    <View style={[styles.bubble, mine && styles.bubbleMine]}>
                      <AppText style={[styles.messageText, mine && styles.messageTextMine]}>
                        {item.body || '…'}
                      </AppText>
                      <AppText
                        variant="caption"
                        style={[styles.time, mine && styles.timeMine]}>
                        {new Intl.DateTimeFormat(
                          language === 'fr' ? 'fr-FR' : 'en-GB',
                          { hour: '2-digit', minute: '2-digit' },
                        ).format(new Date(item.created_at))}
                      </AppText>
                    </View>
                  </View>
                );
              }}
            />
            <View style={styles.composer}>
              <TextInput
                accessibilityLabel={t('messagePlaceholder')}
                placeholder={t('messagePlaceholder')}
                placeholderTextColor="#8A827A"
                multiline
                maxLength={2000}
                value={draft}
                onChangeText={setDraft}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('send')}
                accessibilityState={{ disabled: !draft.trim() || sending, busy: sending }}
                disabled={!draft.trim() || sending}
                onPress={send}
                style={({ pressed }) => [
                  styles.sendButton,
                  (!draft.trim() || sending) && styles.sendDisabled,
                  pressed && styles.pressed,
                ]}>
                <Ionicons name="arrow-up" size={22} color={colors.white} />
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  flex: { flex: 1 },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.goldLight },
  headerCopy: { flex: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  bannerWrap: { padding: spacing.sm },
  list: { flexGrow: 1, padding: spacing.md, gap: spacing.sm },
  empty: {
    flex: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { color: colors.textMuted, textAlign: 'center' },
  messageRow: { alignItems: 'flex-start' },
  messageRowMine: { alignItems: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: radius.md,
    borderBottomLeftRadius: 4,
    backgroundColor: colors.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 2,
  },
  bubbleMine: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: 4,
  },
  messageText: { fontSize: 15, lineHeight: 21 },
  messageTextMine: { color: colors.white },
  time: { fontSize: 10, alignSelf: 'flex-end' },
  timeMine: { color: 'rgba(255,255,255,0.58)' },
  composer: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 110,
    borderRadius: radius.lg,
    backgroundColor: colors.cream,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
  },
  sendDisabled: { opacity: 0.38 },
  pressed: { opacity: 0.72 },
});
