import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { IoniconName, ScoreLevel } from '../types';
import { SCORE_LEVEL_LABEL, scoreLevel } from '../utils/scoring';
import { AppText } from './AppText';

/** Ícone por nível: a informação nunca depende só da cor (daltonismo). */
const LEVEL_ICON: Record<ScoreLevel, IoniconName> = {
  otimo: 'checkmark-circle',
  bom: 'thumbs-up',
  regular: 'alert-circle',
  critico: 'close-circle',
};

export interface ScoreMeterProps {
  label: string;
  score: number;
  icon?: IoniconName;
  compact?: boolean;
}

function ScoreMeterBase({ label, score, icon, compact = false }: ScoreMeterProps) {
  const { theme } = useAppTheme();
  const level = scoreLevel(score);
  const levelColor = theme.colors.score[level];
  const levelLabel = SCORE_LEVEL_LABEL[level];

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${label}: ${score} de 100, ${levelLabel}`}
      accessibilityValue={{ min: 0, max: 100, now: score }}
      style={[styles.container, compact ? styles.compact : null]}
    >
      <View style={styles.header}>
        <View style={styles.labelRow}>
          {icon ? <Ionicons name={icon} size={16 * theme.fontScale} color={theme.colors.textMuted} /> : null}
          <AppText variant="caption" color="textMuted" numberOfLines={1}>
            {label}
          </AppText>
        </View>
        <View style={styles.valueRow}>
          <Ionicons name={LEVEL_ICON[level]} size={18 * theme.fontScale} color={levelColor} />
          <AppText variant="label" colorValue={levelColor}>
            {score} · {levelLabel}
          </AppText>
        </View>
      </View>
      <View
        style={[
          styles.track,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderColor: theme.colors.border,
            borderWidth: theme.isHighContrast ? 1 : 0,
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            { width: `${Math.max(4, score)}%`, backgroundColor: levelColor, borderRadius: theme.radius.pill },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6, paddingVertical: 4 },
  compact: { paddingVertical: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  track: { height: 10, overflow: 'hidden' },
  fill: { height: '100%' },
});

// [MEMORY MANAGEMENT] Recebe apenas primitivos → React.memo compara de forma barata.
export const ScoreMeter = memo(ScoreMeterBase);
