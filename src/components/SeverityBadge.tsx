import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SEVERITIES } from '../data/catalog';
import { useAppTheme } from '../context/ThemeContext';
import type { AppTheme } from '../theme/theme';
import type { Severity } from '../types';
import { AppText } from './AppText';

export function severityColors(theme: AppTheme, severity: Severity): { bg: string; fg: string } {
  const c = theme.colors;
  switch (severity) {
    case 'critica':
      return { bg: c.danger, fg: c.onDanger };
    case 'alta':
      return { bg: c.warning, fg: c.onWarning };
    case 'media':
      return { bg: c.surfaceAlt, fg: c.text };
    case 'baixa':
    default:
      return { bg: c.surfaceAlt, fg: c.textMuted };
  }
}

function SeverityBadgeBase({ severity }: { severity: Severity }) {
  const { theme } = useAppTheme();
  const meta = SEVERITIES[severity];
  const { bg, fg } = severityColors(theme, severity);

  return (
    <View
      accessible
      accessibilityLabel={`Gravidade ${meta.label}`}
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderRadius: theme.radius.pill,
          borderColor: theme.colors.border,
          borderWidth: theme.isHighContrast ? theme.borderWidth : 0,
        },
      ]}
    >
      <Ionicons name={meta.icon} size={14 * theme.fontScale} color={fg} />
      <AppText variant="caption" colorValue={fg} weight="800">
        {meta.label.toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
});

export const SeverityBadge = memo(SeverityBadgeBase);
