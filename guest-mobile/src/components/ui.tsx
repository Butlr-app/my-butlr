import { Ionicons } from '@expo/vector-icons';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts, radius, spacing } from '@/constants/theme';

export function AppText({
  variant = 'body',
  style,
  ...props
}: TextProps & {
  variant?: 'display' | 'title' | 'body' | 'bodyMedium' | 'caption' | 'eyebrow';
}) {
  return <Text {...props} style={[textStyles[variant], style]} />;
}

const textStyles = StyleSheet.create({
  display: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 38,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 26,
    lineHeight: 30,
  },
  body: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
  },
  bodyMedium: {
    color: colors.text,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 21,
  },
  caption: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  eyebrow: {
    color: colors.gold,
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
});

export function Screen({
  children,
  contentContainerStyle,
  refreshControl,
}: PropsWithChildren<{
  contentContainerStyle?: ViewStyle;
  refreshControl?: ReactNode;
}>) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.screenContent, contentContainerStyle]}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl as never}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
      <AppText variant="display">{title}</AppText>
      {subtitle ? <AppText style={styles.headerSubtitle}>{subtitle}</AppText> : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle | ViewStyle[] }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        isDisabled && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.navy : colors.white} />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={19}
              color={variant === 'secondary' ? colors.navy : colors.white}
            />
          ) : null}
          <AppText
            variant="bodyMedium"
            style={variant === 'secondary' ? styles.buttonTextSecondary : styles.buttonText}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  multiline,
  style,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <AppText variant="bodyMedium" style={styles.fieldLabel}>
        {label}
      </AppText>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor="#928980"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !props.editable }}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          error && styles.inputError,
          style,
        ]}
      />
      {error ? (
        <AppText style={styles.errorText} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function InfoBanner({
  message,
  tone = 'error',
}: {
  message: string;
  tone?: 'error' | 'warning' | 'success';
}) {
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        tone === 'warning' && styles.bannerWarning,
        tone === 'success' && styles.bannerSuccess,
      ]}>
      <Ionicons
        name={tone === 'success' ? 'checkmark-circle' : 'information-circle'}
        size={20}
        color={
          tone === 'success'
            ? colors.success
            : tone === 'warning'
              ? colors.warning
              : colors.error
        }
      />
      <AppText style={styles.bannerText}>{message}</AppText>
    </View>
  );
}

export function LoadingScreen() {
  return (
    <SafeAreaView style={styles.loading}>
      <ActivityIndicator color={colors.gold} size="large" />
      <AppText variant="title" style={styles.loadingBrand}>
        My Butlr
      </AppText>
    </SafeAreaView>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <AppText variant="title">{title}</AppText>
      {action}
    </View>
  );
}

export function IconTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={22} color={colors.gold} />
      </View>
      <AppText variant="caption" style={styles.tileLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.cream },
  screenContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
    gap: spacing.md,
  },
  header: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  headerSubtitle: { color: colors.textMuted },
  card: {
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    shadowColor: colors.navy,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDanger: { backgroundColor: colors.error },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.82 },
  buttonText: { color: colors.white },
  buttonTextSecondary: { color: colors.navy },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13 },
  input: {
    minHeight: 50,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  inputError: { borderColor: colors.error },
  errorText: {
    color: colors.error,
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    lineHeight: 17,
  },
  banner: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.errorSoft,
    padding: 12,
    alignItems: 'flex-start',
  },
  bannerWarning: { backgroundColor: colors.warningSoft },
  bannerSuccess: { backgroundColor: colors.successSoft },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 20 },
  loading: {
    flex: 1,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingBrand: { color: colors.goldLight },
  sectionTitle: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tile: {
    flex: 1,
    minHeight: 92,
    minWidth: 72,
    borderRadius: radius.md,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: colors.white,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tilePressed: { backgroundColor: colors.creamDeep, opacity: 0.85 },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.creamDeep,
  },
  tileLabel: { color: colors.text, textAlign: 'center', fontFamily: fonts.bodyMedium },
});
