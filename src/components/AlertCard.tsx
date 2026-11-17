import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { CATEGORIES, SEVERITIES } from '../data/catalog';
import { useAppTheme } from '../context/ThemeContext';
import type { AlertFeedItem, AlertVote } from '../types';
import { formatRelativeTime, pluralize } from '../utils/format';
import { AccessibleButton } from './AccessibleButton';
import { AppText } from './AppText';
import { SeverityBadge } from './SeverityBadge';

export interface AlertCardProps {
  item: AlertFeedItem;
  userVote?: AlertVote;
  /** Este aparelho é o autor do alerta (pode encerrar o próprio reporte). */
  isAuthor: boolean;
  onConfirm: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}

function AlertCardBase({ item, userVote, isAuthor, onConfirm, onResolve }: AlertCardProps) {
  const { theme } = useAppTheme();
  const { alert, relevance, segmentLabel, neighborhood } = item;
  const category = CATEGORIES[alert.category];
  const severity = SEVERITIES[alert.severity];
  const isActive = alert.status === 'ativo';

  // [MEMORY MANAGEMENT] Callbacks estáveis por item (id + callback único do pai).
  const handleConfirm = useCallback(() => onConfirm(alert.id), [onConfirm, alert.id]);
  const handleResolve = useCallback(() => onResolve(alert.id), [onResolve, alert.id]);

  const hasVoted = userVote !== undefined;
  const canConfirm = isActive && !hasVoted;
  const canResolve = isActive && (!hasVoted || (isAuthor && userVote === 'confirmou'));

  const timeText = isActive
    ? `Confirmado ${formatRelativeTime(alert.lastConfirmedAt)}`
    : `Resolvido ${formatRelativeTime(alert.resolvedAt ?? alert.updatedAt)}`;

  const summaryLabel =
    `${category.label}, gravidade ${severity.label}. ${alert.reference}. ${segmentLabel}. ` +
    `${alert.description} ${pluralize(alert.confirmations, 'confirmação', 'confirmações')}, ` +
    `${pluralize(alert.resolvedVotes, 'voto', 'votos')} de resolvido. ` +
    (isActive ? `Relevância ${relevance} de 100. ` : 'Alerta resolvido. ') +
    timeText;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: theme.borderWidth,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          gap: theme.spacing.sm,
          opacity: isActive ? 1 : 0.85,
        },
      ]}
    >
      <View accessible accessibilityLabel={summaryLabel} style={{ gap: theme.spacing.sm }}>
        <View style={styles.headerRow}>
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.border,
                borderWidth: theme.isHighContrast ? theme.borderWidth : 0,
              },
            ]}
          >
            <Ionicons name={category.icon} size={24 * theme.fontScale} color={theme.colors.text} />
          </View>
          <View style={styles.flex}>
            <AppText variant="title">{category.label}</AppText>
            <AppText variant="caption" color="textMuted">
              {neighborhood}
            </AppText>
          </View>
          {isActive ? (
            <SeverityBadge severity={alert.severity} />
          ) : (
            <View style={styles.resolvedTag}>
              <Ionicons name="checkmark-done" size={18 * theme.fontScale} color={theme.colors.success} />
              <AppText variant="caption" color="success" weight="800">
                RESOLVIDO
              </AppText>
            </View>
          )}
        </View>

        <AppText variant="label">{alert.reference}</AppText>
        <AppText variant="caption" color="textMuted">
          {segmentLabel}
        </AppText>
        {alert.description ? <AppText variant="body">{alert.description}</AppText> : null}

        <View style={styles.statsRow}>
          <AppText variant="caption" color="textMuted">
            {pluralize(alert.confirmations, 'confirmação', 'confirmações')} ·{' '}
            {pluralize(alert.resolvedVotes, 'voto', 'votos')} resolvido
          </AppText>
          {isActive ? (
            <AppText variant="caption" color="primary" weight="800">
              Relevância {relevance}
            </AppText>
          ) : null}
        </View>
        <AppText variant="caption" color="textMuted">
          {timeText} · por {alert.authorName}
        </AppText>
      </View>

      {isActive ? (
        <View style={[styles.actions, { gap: theme.spacing.sm }]}>
          <AccessibleButton
            label={userVote === 'confirmou' ? 'Você confirmou' : 'Ainda está lá'}
            icon="hand-left"
            variant="primary"
            onPress={handleConfirm}
            disabled={!canConfirm}
            accessibilityHint="Confirma que o problema continua no local e aumenta a relevância do alerta"
            style={styles.flex}
          />
          <AccessibleButton
            label={userVote === 'resolveu' ? 'Você marcou' : isAuthor ? 'Encerrar' : 'Resolvido'}
            icon="checkmark-circle"
            variant="secondary"
            onPress={handleResolve}
            disabled={!canResolve}
            accessibilityHint={
              isAuthor
                ? 'Você criou este alerta: encerra imediatamente'
                : 'Vota que o problema foi resolvido. Com votos suficientes o alerta é encerrado'
            }
            style={styles.flex}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  resolvedTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  flex: { flex: 1 },
});

// [MEMORY MANAGEMENT] Comparador por campos que mudam a UI: ao votar em um alerta,
// só o card dele re-renderiza na FlatList.
export const AlertCard = memo(
  AlertCardBase,
  (prev, next) =>
    prev.item.alert === next.item.alert &&
    prev.item.relevance === next.item.relevance &&
    prev.userVote === next.userVote &&
    prev.isAuthor === next.isAuthor &&
    prev.onConfirm === next.onConfirm &&
    prev.onResolve === next.onResolve,
);
