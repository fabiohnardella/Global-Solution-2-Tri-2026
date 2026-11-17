import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { IoniconName } from '../types';

export interface IconButtonProps {
  icon: IoniconName;
  /** Obrigatório: botão só com ícone precisa de rótulo para o leitor de tela. */
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
  size?: number;
  color?: string;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

function IconButtonBase({
  icon,
  accessibilityLabel,
  accessibilityHint,
  onPress,
  size = 24,
  color,
  filled = false,
  style,
}: IconButtonProps) {
  const { theme } = useAppTheme();
  const iconColor = color ?? (filled ? theme.colors.onPrimary : theme.colors.text);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        {
          minWidth: theme.touchTarget,
          minHeight: theme.touchTarget,
          borderRadius: theme.radius.pill,
          backgroundColor: filled ? theme.colors.primary : 'transparent',
          borderWidth: theme.isHighContrast ? theme.borderWidth : 0,
          borderColor: theme.colors.border,
        },
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <Ionicons name={icon} size={size * theme.fontScale} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});

export const IconButton = memo(IconButtonBase);
