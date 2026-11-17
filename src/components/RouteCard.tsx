import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { RouteEvaluation, RouteWarning } from '../types';
import { formatDistance, formatDuration } from '../utils/format';
import { SCORE_LEVEL_LABEL } from '../utils/scoring';
import { AccessibleButton } from './AccessibleButton';
import { AppText } from './AppText';
import { ScoreMeter } from './ScoreMeter';

export interface RouteCardProps {
  evaluation: RouteEvaluation;
  rank: number;
  isRecommended: boolean;
  isExpanded: boolean;
  /** Recebe a chave da rota — permite passar a MESMA função para todos os cards. */
  onToggleDetails: (routeKey: string) => void;
  onStartNavigation: (routeKey: string) => void;
}

const MAX_WARNINGS_PREVIEW = 3;

function warningIcon(warning: RouteWarning) {
  if (warning.severity === 'estrutural') return 'information-circle' as const;
  return warning.severity === 'critica' || warning.severity === 'alta' ? ('warning' as const) : ('alert-circle' as const);
}

function RouteCardBase({
  evaluation,
  rank,
  isRecommended,
  isExpanded,
  onToggleDetails,
  onStartNavigation,
}: RouteCardProps) {
  const { theme } = useAppTheme();
  const { key, route } = evaluation;

  // [MEMORY MANAGEMENT] Handlers locais estáveis: dependem só da chave e do callback do pai.
  const handleToggle = useCallback(() => onToggleDetails(key), [onToggleDetails, key]);
  const handleStart = useCallback(() => onStartNavigation(key), [onStartNavigation, key]);

  const previewWarnings = evaluation.warnings.slice(0, MAX_WARNINGS_PREVIEW);
  const hiddenWarnings = evaluation.warnings.length - previewWarnings.length;

  const summaryLabel =
    `${isRecommended ? 'Rota recomendada. ' : ''}Opção ${rank}: ${route.name}. ` +
    `${formatDistance(evaluation.distanceM)}, cerca de ${formatDuration(evaluation.durationMin)}. ` +
    `Nota geral ${evaluation.overallScore}, ${SCORE_LEVEL_LABEL[evaluation.level]}. ` +
    `${evaluation.criticalCount} trecho${evaluation.criticalCount === 1 ? '' : 's'} crítico${evaluation.criticalCount === 1 ? '' : 's'}.`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isRecommended ? theme.colors.primary : theme.colors.border,
          borderWidth: isRecommended ? theme.borderWidth + 2 : theme.borderWidth,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          gap: theme.spacing.md,
        },
      ]}
    >
      <View accessible accessibilityLabel={summaryLabel} style={{ gap: theme.spacing.xs }}>
        {isRecommended ? (
          <View
            style={[
              styles.recommendedBadge,
              { backgroundColor: theme.colors.primary, borderRadius: theme.radius.pill },
            ]}
          >
            <Ionicons name="star" size={14 * theme.fontScale} color={theme.colors.onPrimary} />
            <AppText variant="caption" colorValue={theme.colors.onPrimary} weight="800">
              ROTA RECOMENDADA
            </AppText>
          </View>
        ) : null}
        <AppText variant="title">
          {rank}. {route.name}
        </AppText>
        <AppText variant="body" color="textMuted">
          {route.summary}
        </AppText>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="navigate" size={16 * theme.fontScale} color={theme.colors.textMuted} />
            <AppText variant="caption" color="textMuted">
              {formatDistance(evaluation.distanceM)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time" size={16 * theme.fontScale} color={theme.colors.textMuted} />
            <AppText variant="caption" color="textMuted">
              {formatDuration(evaluation.durationMin)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <Ionicons
              name={evaluation.criticalCount > 0 ? 'warning' : 'shield-checkmark'}
              size={16 * theme.fontScale}
              color={evaluation.criticalCount > 0 ? theme.colors.danger : theme.colors.success}
            />
            <AppText
              variant="caption"
              colorValue={evaluation.criticalCount > 0 ? theme.colors.danger : theme.colors.success}
              weight="700"
            >
              {evaluation.criticalCount === 0
                ? 'Sem trechos críticos'
                : `${evaluation.criticalCount} trecho${evaluation.criticalCount > 1 ? 's' : ''} crítico${
                    evaluation.criticalCount > 1 ? 's' : ''
                  }`}
            </AppText>
          </View>
        </View>
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        <ScoreMeter label="Acessibilidade" icon="accessibility" score={evaluation.accessibilityScore} />
        <ScoreMeter label="Segurança" icon="shield" score={evaluation.safetyScore} />
        <ScoreMeter label="Nota geral" icon="star" score={evaluation.overallScore} />
      </View>

      {previewWarnings.length > 0 ? (
        <View
          style={[
            styles.warningBox,
            {
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              gap: theme.spacing.xs,
              borderColor: theme.colors.border,
              borderWidth: theme.isHighContrast ? theme.borderWidth : 0,
            },
          ]}
        >
          <AppText variant="label">Alertas no caminho</AppText>
          {previewWarnings.map((warning) => (
            <View key={warning.id} style={styles.warningRow}>
              <Ionicons
                name={warningIcon(warning)}
                size={18 * theme.fontScale}
                color={warning.severity === 'estrutural' ? theme.colors.textMuted : theme.colors.danger}
              />
              <AppText variant="caption" style={styles.flex}>
                {warning.message}
              </AppText>
            </View>
          ))}
          {hiddenWarnings > 0 ? (
            <AppText variant="caption" color="textMuted">
              + {hiddenWarnings} {hiddenWarnings === 1 ? 'alerta' : 'alertas'} nos detalhes
            </AppText>
          ) : null}
        </View>
      ) : null}

      {isExpanded ? (
        // Lista curta (≤ 6 trechos): map simples é mais leve que uma FlatList aninhada.
        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="label">Trecho a trecho</AppText>
          {evaluation.segments.map((step, index) => (
            <View
              key={`${step.segment.id}-${index}`}
              accessible
              accessibilityLabel={`Trecho ${index + 1}: ${step.instruction} Acessibilidade ${step.accessibilityScore}, segurança ${step.safetyScore}.${
                step.isCritical ? ' Trecho crítico.' : ''
              }`}
              style={[
                styles.segmentRow,
                {
                  borderLeftColor: step.isCritical ? theme.colors.danger : theme.colors.success,
                  borderLeftWidth: 4,
                  paddingLeft: theme.spacing.md,
                },
              ]}
            >
              <AppText variant="body">
                {index + 1}. {step.instruction}
              </AppText>
              <AppText variant="caption" color="textMuted">
                Acessib. {step.accessibilityScore} · Segur. {step.safetyScore}
                {step.isCritical ? ' · CRÍTICO' : ''}
                {step.activeAlerts.length > 0
                  ? ` · ${step.activeAlerts.length} alerta${step.activeAlerts.length > 1 ? 's' : ''}`
                  : ''}
              </AppText>
            </View>
          ))}
          {evaluation.warnings.slice(MAX_WARNINGS_PREVIEW).map((warning) => (
            <View key={`extra-${warning.id}`} style={styles.warningRow}>
              <Ionicons name={warningIcon(warning)} size={18 * theme.fontScale} color={theme.colors.textMuted} />
              <AppText variant="caption" style={styles.flex}>
                {warning.message}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.actions, { gap: theme.spacing.sm }]}>
        <AccessibleButton
          label={isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
          icon={isExpanded ? 'chevron-up' : 'chevron-down'}
          variant="secondary"
          onPress={handleToggle}
          accessibilityHint="Mostra a avaliação de cada trecho da rota"
          style={styles.flex}
        />
        <AccessibleButton
          label="Iniciar"
          icon="navigate"
          variant="primary"
          onPress={handleStart}
          accessibilityLabel={`Iniciar navegação assistida: ${route.name}`}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  warningBox: {},
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  segmentRow: { gap: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap' },
  flex: { flex: 1 },
});

// [MEMORY MANAGEMENT] Comparador customizado: a avaliação vem memoizada do hook
// (mesma referência enquanto alertas/perfil não mudam), então comparar por
// referência + flags evita re-render de todos os cards ao expandir apenas um.
export const RouteCard = memo(
  RouteCardBase,
  (prev, next) =>
    prev.evaluation === next.evaluation &&
    prev.rank === next.rank &&
    prev.isRecommended === next.isRecommended &&
    prev.isExpanded === next.isExpanded &&
    prev.onToggleDetails === next.onToggleDetails &&
    prev.onStartNavigation === next.onStartNavigation,
);
