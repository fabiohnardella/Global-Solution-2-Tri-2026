import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { CATEGORIES } from '../data/catalog';
import { useAppTheme } from '../context/ThemeContext';
import type { SegmentEvaluation } from '../types';
import { formatDistance, formatDuration } from '../utils/format';
import { AppText } from './AppText';

export type StepStatus = 'feito' | 'atual' | 'proximo';

export interface NavigationStepItemProps {
  step: SegmentEvaluation;
  index: number;
  total: number;
  status: StepStatus;
  /** Toque para ouvir o passo novamente / pular para ele. */
  onPress: (index: number) => void;
}

const STATUS_LABEL: Record<StepStatus, string> = {
  feito: 'concluído',
  atual: 'em andamento',
  proximo: 'a seguir',
};

function NavigationStepItemBase({ step, index, total, status, onPress }: NavigationStepItemProps) {
  const { theme } = useAppTheme();
  const handlePress = useCallback(() => onPress(index), [onPress, index]);
  const isCurrent = status === 'atual';
  const isDone = status === 'feito';

  const circleBg = isDone ? theme.colors.success : isCurrent ? theme.colors.primary : theme.colors.surfaceAlt;
  const circleFg = isDone ? theme.colors.onSuccess : isCurrent ? theme.colors.onPrimary : theme.colors.text;

  const hazardsText =
    step.activeAlerts.length > 0
      ? step.activeAlerts.map((a) => CATEGORIES[a.alert.category].label).join(', ')
      : '';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityState={{ selected: isCurrent }}
      accessibilityLabel={`Passo ${index + 1} de ${total}, ${STATUS_LABEL[status]}. ${step.instruction}${
        hazardsText ? ` Alertas: ${hazardsText}.` : ''
      }${step.isCritical ? ' Trecho crítico.' : ''}`}
      accessibilityHint="Toque duas vezes para ouvir este passo"
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: theme.touchTarget + 24,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: isCurrent ? theme.colors.surfaceAlt : theme.colors.surface,
          borderColor: isCurrent ? theme.colors.primary : theme.colors.border,
          borderWidth: isCurrent ? theme.borderWidth + 2 : theme.borderWidth,
          opacity: isDone ? 0.7 : 1,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={[styles.circle, { backgroundColor: circleBg, borderColor: theme.colors.border }]}>
        {isDone ? (
          <Ionicons name="checkmark" size={22 * theme.fontScale} color={circleFg} />
        ) : (
          <AppText variant="label" colorValue={circleFg}>
            {index + 1}
          </AppText>
        )}
      </View>
      <View style={styles.flex}>
        <AppText variant={isCurrent ? 'bodyLarge' : 'body'} weight={isCurrent ? '700' : '400'}>
          {step.instruction}
        </AppText>
        <AppText variant="caption" color="textMuted">
          {step.segment.kind === 'metro' ? 'Metrô' : formatDistance(step.segment.distanceM)} · {formatDuration(step.durationMin)}
        </AppText>
        {hazardsText ? (
          <View style={styles.hazardRow}>
            <Ionicons name="warning" size={16 * theme.fontScale} color={theme.colors.danger} />
            <AppText variant="caption" color="danger" weight="700" style={styles.flex}>
              {hazardsText}
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  hazardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  pressed: { opacity: 0.8 },
  flex: { flex: 1 },
});

// [MEMORY MANAGEMENT] Ao avançar de passo, só os itens que mudam de status re-renderizam.
export const NavigationStepItem = memo(NavigationStepItemBase);
