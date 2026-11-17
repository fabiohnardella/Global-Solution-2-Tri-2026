import type { TextStyle } from 'react-native';
import type { ScoreLevel } from '../types';

/* ==========================================================================
 * Tema acessível: paleta padrão (contraste ≥ 4.5:1) e Alto Contraste (≥ 7:1)
 * ========================================================================== */

/** Área de toque mínima recomendada (WCAG 2.5.5 / Material: 48x48dp). */
export const MIN_TOUCH_TARGET = 48;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  onPrimary: string;
  danger: string;
  onDanger: string;
  success: string;
  onSuccess: string;
  warning: string;
  onWarning: string;
  focus: string;
  overlay: string;
  score: Record<ScoreLevel, string>;
  onScore: Record<ScoreLevel, string>;
}

type TypographyVariant = 'display' | 'headline' | 'title' | 'bodyLarge' | 'body' | 'label' | 'caption';

export type TypographyStyle = Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight' | 'letterSpacing'>;

export interface AppTheme {
  mode: 'padrao' | 'alto_contraste';
  isHighContrast: boolean;
  fontScale: number;
  colors: ThemeColors;
  typography: Record<TypographyVariant, TypographyStyle>;
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number; xxl: number };
  radius: { sm: number; md: number; lg: number; pill: number };
  borderWidth: number;
  touchTarget: number;
}

export type TextVariant = TypographyVariant;

const STANDARD_COLORS: ThemeColors = {
  background: '#F3F5F8',
  surface: '#FFFFFF',
  surfaceAlt: '#E8EDF4',
  text: '#101828',
  textMuted: '#475467',
  border: '#98A2B3',
  primary: '#0B4FB3',
  onPrimary: '#FFFFFF',
  danger: '#B42318',
  onDanger: '#FFFFFF',
  success: '#067647',
  onSuccess: '#FFFFFF',
  warning: '#8A4B00',
  onWarning: '#FFFFFF',
  focus: '#7A5AF8',
  overlay: 'rgba(16, 24, 40, 0.55)',
  score: { otimo: '#067647', bom: '#2E6B00', regular: '#8A4B00', critico: '#B42318' },
  onScore: { otimo: '#FFFFFF', bom: '#FFFFFF', regular: '#FFFFFF', critico: '#FFFFFF' },
};

const HIGH_CONTRAST_COLORS: ThemeColors = {
  background: '#000000',
  surface: '#000000',
  surfaceAlt: '#1A1A1A',
  text: '#FFFFFF',
  textMuted: '#F2F2F2',
  border: '#FFFFFF',
  primary: '#FFE500',
  onPrimary: '#000000',
  danger: '#FF8080',
  onDanger: '#000000',
  success: '#7CFC7C',
  onSuccess: '#000000',
  warning: '#FFB84D',
  onWarning: '#000000',
  focus: '#00FFFF',
  overlay: 'rgba(0, 0, 0, 0.85)',
  score: { otimo: '#7CFC7C', bom: '#C6FF66', regular: '#FFB84D', critico: '#FF8080' },
  onScore: { otimo: '#000000', bom: '#000000', regular: '#000000', critico: '#000000' },
};

const BASE_TYPOGRAPHY: Record<TypographyVariant, TypographyStyle> = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '800' },
  headline: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  bodyLarge: { fontSize: 18, lineHeight: 26, fontWeight: '400' },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  label: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: 0.2 },
  caption: { fontSize: 14, lineHeight: 19, fontWeight: '500' },
};

function scaleTypography(scale: number): Record<TypographyVariant, TypographyStyle> {
  const entries = Object.entries(BASE_TYPOGRAPHY) as [TypographyVariant, TypographyStyle][];
  return entries.reduce(
    (acc, [key, style]) => {
      acc[key] = {
        ...style,
        fontSize: Math.round((style.fontSize ?? 16) * scale),
        lineHeight: Math.round((style.lineHeight ?? 22) * scale),
      };
      return acc;
    },
    {} as Record<TypographyVariant, TypographyStyle>,
  );
}

/** Cria o tema. Chamado só quando as preferências mudam (memoizado no ThemeProvider). */
export function buildTheme(highContrast: boolean, largeText: boolean): AppTheme {
  const fontScale = largeText ? 1.2 : 1;
  return {
    mode: highContrast ? 'alto_contraste' : 'padrao',
    isHighContrast: highContrast,
    fontScale,
    colors: highContrast ? HIGH_CONTRAST_COLORS : STANDARD_COLORS,
    typography: scaleTypography(fontScale),
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { sm: 8, md: 12, lg: 16, pill: 999 },
    borderWidth: highContrast ? 2 : 1,
    touchTarget: MIN_TOUCH_TARGET,
  };
}
