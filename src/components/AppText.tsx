import React, { memo } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { TextVariant, ThemeColors } from '../theme/theme';

type ColorKey = Exclude<keyof ThemeColors, 'score' | 'onScore'>;

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: ColorKey;
  /** Cor literal (ex.: cor do nível do score). Tem prioridade sobre `color`. */
  colorValue?: string;
  weight?: TextStyle['fontWeight'];
  align?: TextStyle['textAlign'];
}

/**
 * Texto tipográfico do app: aplica a escala do tema (Texto Grande) e respeita
 * o tamanho de fonte do sistema (allowFontScaling padrão do React Native).
 */
function AppTextBase({ variant = 'body', color = 'text', colorValue, weight, align, style, ...rest }: AppTextProps) {
  const { theme } = useAppTheme();
  const typography = theme.typography[variant];
  return (
    <Text
      {...rest}
      style={[
        typography,
        { color: colorValue ?? theme.colors[color] },
        weight ? { fontWeight: weight } : null,
        align ? { textAlign: align } : null,
        style,
      ]}
    />
  );
}

// [MEMORY MANAGEMENT] React.memo: textos estáticos não re-renderizam com o pai.
export const AppText = memo(AppTextBase);
