import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { IoniconName } from '../types';
import { AppText } from './AppText';

/* ==========================================================================
 * Toggles do topo: Alto Contraste e Texto Grande (role="switch").
 * ========================================================================== */

interface ToggleChipProps {
  icon: IoniconName;
  shortLabel: string;
  accessibilityLabel: string;
  checked: boolean;
  onPress: () => void;
}

function ToggleChipBase({ icon, shortLabel, accessibilityLabel, checked, onPress }: ToggleChipProps) {
  const { theme } = useAppTheme();
  const bg = checked ? theme.colors.primary : theme.colors.surface;
  const fg = checked ? theme.colors.onPrimary : theme.colors.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked }}
      accessibilityHint="Toque duas vezes para alternar"
      hitSlop={6}
      style={({ pressed }) => [
        styles.chip,
        {
          minHeight: theme.touchTarget,
          minWidth: theme.touchTarget,
          borderRadius: theme.radius.pill,
          backgroundColor: bg,
          borderColor: theme.colors.border,
          borderWidth: theme.borderWidth,
          paddingHorizontal: theme.spacing.md,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <Ionicons name={icon} size={20 * theme.fontScale} color={fg} />
      <AppText variant="caption" colorValue={fg} weight="800">
        {shortLabel}
      </AppText>
    </Pressable>
  );
}

const ToggleChip = memo(ToggleChipBase);

export function HighContrastToggleBase() {
  const { highContrast, toggleHighContrast } = useAppTheme();
  return (
    <ToggleChip
      icon="contrast"
      shortLabel={highContrast ? 'AC ligado' : 'AC'}
      accessibilityLabel="Modo alto contraste"
      checked={highContrast}
      onPress={toggleHighContrast}
    />
  );
}

export function LargeTextToggleBase() {
  const { largeText, toggleLargeText } = useAppTheme();
  return (
    <ToggleChip
      icon="text"
      shortLabel={largeText ? 'A+ ligado' : 'A+'}
      accessibilityLabel="Texto grande"
      checked={largeText}
      onPress={toggleLargeText}
    />
  );
}

export const HighContrastToggle = memo(HighContrastToggleBase);
export const LargeTextToggle = memo(LargeTextToggleBase);

/** Os dois toggles lado a lado, para uso no cabeçalho. */
function DisplayTogglesBase() {
  return (
    <View style={styles.row}>
      <LargeTextToggle />
      <HighContrastToggle />
    </View>
  );
}

export const DisplayToggles = memo(DisplayTogglesBase);

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  pressed: { opacity: 0.75 },
  row: { flexDirection: 'row', gap: 8 },
});
