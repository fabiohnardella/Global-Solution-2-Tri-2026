import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View, type ListRenderItem } from 'react-native';
import { AlertCard, AppHeader, AppText, EmptyState, FilterChip, StatusBanner } from '../components';
import { CATEGORY_LIST, SEVERITY_LIST } from '../data/catalog';
import { SEGMENTS_BY_ID } from '../data/segments';
import { useAppActions, useAppState } from '../context/AppDataContext';
import { useAppTheme } from '../context/ThemeContext';
import { useAlertFeed } from '../hooks/useRouteData';
import { useTimedMessage } from '../hooks/useTimedMessage';
import type { AlertFeedItem, AlertStatus, BarrierCategory, Severity } from '../types';
import type { MainTabParamList } from '../types/navigation';

/* ==========================================================================
 * Funcionalidade 3 — Feed de Alertas Comunitários com Validação
 * ========================================================================== */

type StatusFilter = AlertStatus | 'todos';
type CategoryFilter = BarrierCategory | 'todas';
type SeverityFilter = Severity | 'todas';

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: 'ativo', label: 'Ativos' },
  { id: 'resolvido', label: 'Resolvidos' },
  { id: 'todos', label: 'Todos' },
];

export function AlertsScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList, 'Alerts'>>();
  const route = useRoute<RouteProp<MainTabParamList, 'Alerts'>>();
  const { votes, session } = useAppState();
  const { confirmAlert, markAlertResolved } = useAppActions();
  const feed = useAlertFeed();
  const { message, show, clear } = useTimedMessage(5000);

  const [status, setStatus] = useState<StatusFilter>('ativo');
  const [category, setCategory] = useState<CategoryFilter>('todas');
  const [severity, setSeverity] = useState<SeverityFilter>('todas');
  const [segmentFilter, setSegmentFilter] = useState<string | null>(route.params?.segmentId ?? null);

  useEffect(() => {
    if (route.params?.segmentId) setSegmentFilter(route.params.segmentId);
  }, [route.params?.segmentId]);

  const citizenId = session?.citizenId ?? 'anonimo';

  // [MEMORY MANAGEMENT] Filtragem e contadores memoizados: só recalculam quando o
  // feed (alertas) ou algum filtro muda.
  const filtered = useMemo(
    () =>
      feed.filter(
        (item) =>
          (status === 'todos' || item.alert.status === status) &&
          (category === 'todas' || item.alert.category === category) &&
          (severity === 'todas' || item.alert.severity === severity) &&
          (!segmentFilter || item.alert.segmentId === segmentFilter),
      ),
    [feed, status, category, severity, segmentFilter],
  );

  const stats = useMemo(() => {
    const active = feed.filter((i) => i.alert.status === 'ativo');
    const byCategory: Partial<Record<BarrierCategory, number>> = {};
    for (const item of active) byCategory[item.alert.category] = (byCategory[item.alert.category] ?? 0) + 1;
    return {
      active: active.length,
      severe: active.filter((i) => i.alert.severity === 'alta' || i.alert.severity === 'critica').length,
      byCategory,
    };
  }, [feed]);

  /* ------------------------------- Handlers -------------------------------- */

  const handleStatus = useCallback((v: string) => setStatus(v as StatusFilter), []);
  const handleCategory = useCallback((v: string) => setCategory(v as CategoryFilter), []);
  const handleSeverity = useCallback((v: string) => setSeverity(v as SeverityFilter), []);
  const clearSegmentFilter = useCallback(() => {
    setSegmentFilter(null);
    navigation.setParams({ segmentId: undefined });
  }, [navigation]);

  // [MEMORY MANAGEMENT] Um único callback estável para todos os cards (recebe o id).
  const handleConfirm = useCallback(
    (alertId: string) => {
      const result = confirmAlert(alertId);
      if (result === 'registrado') show('Obrigado! Confirmação registrada e relevância do alerta atualizada.', 'success');
      else if (result === 'ja_votou') show('Você já votou neste alerta.', 'info');
      else show('Este alerta não está mais ativo.', 'info');
    },
    [confirmAlert, show],
  );

  const handleResolve = useCallback(
    (alertId: string) => {
      const result = markAlertResolved(alertId);
      if (result === 'encerrado') show('Alerta encerrado como resolvido. As rotas foram recalculadas.', 'success');
      else if (result === 'registrado') show('Voto registrado. O alerta é encerrado quando mais pessoas confirmarem.', 'success');
      else if (result === 'ja_votou') show('Você já votou neste alerta.', 'info');
      else show('Este alerta não está mais ativo.', 'info');
    },
    [markAlertResolved, show],
  );

  const renderItem = useCallback<ListRenderItem<AlertFeedItem>>(
    ({ item }) => (
      <AlertCard
        item={item}
        userVote={votes[item.alert.id]}
        isAuthor={item.alert.authorId === citizenId}
        onConfirm={handleConfirm}
        onResolve={handleResolve}
      />
    ),
    [votes, citizenId, handleConfirm, handleResolve],
  );

  const keyExtractor = useCallback((item: AlertFeedItem) => item.alert.id, []);

  const segment = segmentFilter ? SEGMENTS_BY_ID[segmentFilter] : undefined;

  const listHeader = useMemo(
    () => (
      <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.sm }}>
        <View accessibilityRole="radiogroup" accessibilityLabel="Situação" style={[styles.wrap, { gap: theme.spacing.sm }]}>
          {STATUS_OPTIONS.map((o) => (
            <FilterChip key={o.id} value={o.id} label={o.label} selected={status === o.id} onPress={handleStatus} />
          ))}
        </View>

        <AppText variant="label">Tipo de barreira</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          contentContainerStyle={{ gap: theme.spacing.sm }}
        >
          <FilterChip value="todas" label="Todas" icon="apps" selected={category === 'todas'} onPress={handleCategory} />
          {CATEGORY_LIST.map((c) => (
            <FilterChip
              key={c.id}
              value={c.id}
              label={c.label}
              icon={c.icon}
              count={stats.byCategory[c.id] ?? 0}
              selected={category === c.id}
              onPress={handleCategory}
            />
          ))}
        </ScrollView>

        <AppText variant="label">Gravidade</AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityRole="radiogroup"
          contentContainerStyle={{ gap: theme.spacing.sm }}
        >
          <FilterChip value="todas" label="Todas" selected={severity === 'todas'} onPress={handleSeverity} />
          {SEVERITY_LIST.map((s) => (
            <FilterChip
              key={s.id}
              value={s.id}
              label={s.label}
              icon={s.icon}
              selected={severity === s.id}
              onPress={handleSeverity}
            />
          ))}
        </ScrollView>

        {segment ? (
          <FilterChip
            value="trecho"
            label={`Trecho: ${segment.street} ✕`}
            selected
            role="checkbox"
            onPress={clearSegmentFilter}
            accessibilityHint="Remove o filtro por trecho"
          />
        ) : null}

        <AppText variant="caption" color="textMuted" accessibilityLiveRegion="polite">
          Mostrando {filtered.length} de {feed.length} alertas, ordenados por relevância.
        </AppText>
      </View>
    ),
    [theme, status, category, severity, stats, segment, filtered.length, feed.length, handleStatus, handleCategory, handleSeverity, clearSegmentFilter],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Alertas da comunidade"
        subtitle={`${stats.active} ativos · ${stats.severe} de gravidade alta ou crítica`}
      />
      {message ? (
        <View style={{ paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.md }}>
          <StatusBanner text={message.text} tone={message.tone} onDismiss={clear} />
        </View>
      ) : null}
      {/* [MEMORY MANAGEMENT] FlatList otimizada para listas que crescem com os reportes. */}
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={votes}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState icon="checkmark-done-circle" title="Nenhum alerta com esses filtros" message="Tente outra categoria ou gravidade." />
        }
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
});
