import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { FeedbackTone } from '../hooks/useTimedMessage';
import type { IoniconName } from '../types';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

export interface StatusBannerProps {
  text: string;
  tone: FeedbackTone;
  onDismiss?: () => void;
}

const TONE_ICON: Record<FeedbackTone, IoniconName> = {
  success: 'checkmark-circle',
  info: 'information-circle',
  danger: 'warning',
};

function StatusBannerBase({ text, tone, onDismiss }: StatusBannerProps) {
  const { theme } = useAppTheme();
  const bg = tone === 'success' ? theme.colors.success : tone === 'danger' ? theme.colors.danger : theme.colors.primary;
  const fg = tone === 'success' ? theme.colors.onSuccess : tone === 'danger' ? theme.colors.onDanger : theme.colors.onPrimary;

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,
        {
          backgroundColor: bg,
          borderRadius: theme.radius.md,
          paddingLeft: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderColor: theme.colors.border,
          borderWidth: theme.isHighContrast ? theme.borderWidth : 0,
        },
      ]}
    >
      <Ionicons name={TONE_ICON[tone]} size={24 * theme.fontScale} color={fg} />
      <AppText variant="body" colorValue={fg} weight="700" style={styles.flex}>
        {text}
      </AppText>
      {onDismiss ? (
        <IconButton icon="close" accessibilityLabel="Fechar aviso" onPress={onDismiss} color={fg} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
  flex: { flex: 1 },
});

export const StatusBanner = memo(StatusBannerBase);
