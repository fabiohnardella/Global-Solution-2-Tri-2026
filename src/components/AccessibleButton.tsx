import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { AppTheme } from '../theme/theme';
import type { IoniconName } from '../types';
import { AppText } from './AppText';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export type ButtonSize = 'md' | 'lg' | 'xl';

export interface AccessibleButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IoniconName;
  disabled?: boolean;
  loading?: boolean;
  /** Texto lido pelo leitor de tela (padrão: label). */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const HEIGHT: Record<ButtonSize, number> = { md: 48, lg: 56, xl: 72 };
const ICON_SIZE: Record<ButtonSize, number> = { md: 20, lg: 24, xl: 30 };

interface VariantColors {
  background: string;
  text: string;
  border: string;
}

function variantColors(theme: AppTheme, variant: ButtonVariant): VariantColors {
  const c = theme.colors;
  switch (variant) {
    case 'primary':
      return { background: c.primary, text: c.onPrimary, border: c.primary };
    case 'danger':
      return { background: c.danger, text: c.onDanger, border: c.danger };
    case 'success':
      return { background: c.success, text: c.onSuccess, border: c.success };
    case 'secondary':
      return { background: c.surface, text: c.primary, border: c.primary };
    case 'ghost':
    default:
      return { background: 'transparent', text: c.primary, border: 'transparent' };
  }
}

function AccessibleButtonBase({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled = false,
  loading = false,
  accessibilityLabel,
  accessibilityHint,
  fullWidth = false,
  style,
  testID,
}: AccessibleButtonProps) {
  const { theme } = useAppTheme();

  // [MEMORY MANAGEMENT] Estilos derivados do tema memoizados por variante/tamanho.
  const colors = useMemo(() => variantColors(theme, variant), [theme, variant]);
  const containerStyle = useMemo<ViewStyle>(
    () => ({
      minHeight: Math.max(HEIGHT[size], theme.touchTarget),
      minWidth: theme.touchTarget,
      paddingHorizontal: size === 'xl' ? theme.spacing.xl : theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: colors.background,
      borderColor: theme.isHighContrast && variant !== 'ghost' ? theme.colors.border : colors.border,
      borderWidth: variant === 'ghost' ? 0 : theme.borderWidth + (variant === 'secondary' ? 1 : 0),
      alignSelf: fullWidth ? 'stretch' : 'auto',
    }),
    [theme, size, colors, variant, fullWidth],
  );

  const isDisabled = disabled || loading;

  const pressableStyle = ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => [
    styles.base,
    containerStyle,
    pressed && !isDisabled ? styles.pressed : null,
    isDisabled ? styles.disabled : null,
    style,
  ];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      hitSlop={8}
      style={pressableStyle}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : icon ? (
          <Ionicons name={icon} size={ICON_SIZE[size] * theme.fontScale} color={colors.text} />
        ) : null}
        <AppText
          variant={size === 'xl' ? 'title' : 'label'}
          colorValue={colors.text}
          align="center"
          style={styles.label}
        >
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  label: { flexShrink: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
});

// [MEMORY MANAGEMENT] React.memo: só re-renderiza se props (ou o tema) mudarem.
export const AccessibleButton = memo(AccessibleButtonBase);
