import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { IoniconName } from '../types';
import { AppText } from './AppText';

export interface FilterChipProps {
  value: string;
  label: string;
  selected: boolean;
  /** Recebe o value: o pai passa UMA função estável para todos os chips. */
  onPress: (value: string) => void;
  icon?: IoniconName;
  count?: number;
  /** radio = escolha única no grupo; checkbox = múltipla. */
  role?: 'radio' | 'checkbox';
  accessibilityHint?: string;
}

function FilterChipBase({
  value,
  label,
  selected,
  onPress,
  icon,
  count,
  role = 'radio',
  accessibilityHint,
}: FilterChipProps) {
  const { theme } = useAppTheme();
  const handlePress = useCallback(() => onPress(value), [onPress, value]);

  const bg = selected ? theme.colors.primary : theme.colors.surface;
  const fg = selected ? theme.colors.onPrimary : theme.colors.text;
  const text = count !== undefined ? `${label} (${count})` : label;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole={role}
      accessibilityLabel={text}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, checked: selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        {
          minHeight: theme.touchTarget,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.radius.pill,
          backgroundColor: bg,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: theme.borderWidth + (selected && theme.isHighContrast ? 1 : 0),
        },
        pressed ? styles.pressed : null,
      ]}
    >
      {selected ? (
        <Ionicons name="checkmark" size={18 * theme.fontScale} color={fg} />
      ) : icon ? (
        <Ionicons name={icon} size={18 * theme.fontScale} color={fg} />
      ) : null}
      <AppText variant="label" colorValue={fg} numberOfLines={1}>
        {text}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  pressed: { opacity: 0.75 },
});

// [MEMORY MANAGEMENT] Props primitivas + callback estável → memo efetivo.
export const FilterChip = memo(FilterChipBase);
