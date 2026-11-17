import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { IoniconName } from '../types';
import { AccessibleButton } from './AccessibleButton';
import { AppText } from './AppText';

export interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

function EmptyStateBase({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useAppTheme();
  return (
    <View style={[styles.container, { padding: theme.spacing.xl, gap: theme.spacing.md }]}>
      <Ionicons name={icon} size={48 * theme.fontScale} color={theme.colors.textMuted} />
      <AppText variant="title" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" color="textMuted" align="center">
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <AccessibleButton label={actionLabel} onPress={onAction} variant="secondary" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
});

export const EmptyState = memo(EmptyStateBase);
