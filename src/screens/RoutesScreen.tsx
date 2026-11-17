import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View, type ListRenderItem } from 'react-native';
import {
  AppHeader,
  AppText,
  EmptyState,
  FilterChip,
  IconButton,
  PickerField,
  RouteCard,
  type SelectOption,
} from '../components';
import { PROFILES } from '../data/catalog';
import { PLACES, PLACES_BY_ID } from '../data/places';
import { useAppActions, useAppState } from '../context/AppDataContext';
import { useAppTheme } from '../context/ThemeContext';
import { useRouteComparison } from '../hooks/useRouteData';
import type { MobilityProfileId, PeriodSetting, RouteEvaluation } from '../types';
import { getReachableDestinationIds, resolvePeriod } from '../utils/scoring';

/* ==========================================================================
 * Funcionalidade 1 — Buscador e Comparador de Rotas Acessíveis e Seguras
 * ========================================================================== */

const PROFILE_SHORT: Record<MobilityProfileId, string> = {
  cadeirante: 'Cadeirante',
  deficiencia_visual: 'Def. visual',
  idoso: 'Pessoa idosa',
  pedestre: 'Pedestre',
};

const PROFILE_IDS = Object.keys(PROFILES) as MobilityProfileId[];
const PERIOD_IDS: PeriodSetting[] = ['auto', 'dia', 'noite'];

export function RoutesScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const { settings } = useAppState();
  const { updateSettings } = useAppActions();

  const [originId, setOriginId] = useState<string>('consolacao');
  const [destinationId, setDestinationId] = useState<string | null>('hc');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const comparison = useRouteComparison(originId, destinationId);

  // [MEMORY MANAGEMENT] Listas de opções memoizadas (não recriadas a cada render).
  const originOptions = useMemo<SelectOption[]>(
    () => PLACES.map((p) => ({ id: p.id, title: p.name, subtitle: p.address, icon: 'location' })),
    [],
  );

  const reachable = useMemo(() => getReachableDestinationIds(originId), [originId]);

  const destinationOptions = useMemo<SelectOption[]>(
    () =>
      PLACES.filter((p) => p.id !== originId).map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.address,
        icon: 'flag',
        disabled: !reachable.has(p.id),
        disabledReason: reachable.has(p.id) ? undefined : 'Ainda não há rotas mapeadas a partir da origem escolhida.',
      })),
    [originId, reachable],
  );

  /* ------------------------------- Handlers -------------------------------- */

  const handleOrigin = useCallback((id: string) => {
    setOriginId(id);
    setExpandedKey(null);
    const next = getReachableDestinationIds(id);
    setDestinationId((current) => (current && next.has(current) ? current : (next.values().next().value ?? null)));
  }, []);

  const handleDestination = useCallback((id: string) => {
    setDestinationId(id);
    setExpandedKey(null);
  }, []);

  const handleSwap = useCallback(() => {
    if (!destinationId) return;
    setOriginId(destinationId);
    setDestinationId(originId);
    setExpandedKey(null);
  }, [originId, destinationId]);

  const handleProfile = useCallback(
    (value: string) => updateSettings({ profile: value as MobilityProfileId }),
    [updateSettings],
  );

  const handlePeriod = useCallback(
    (value: string) => updateSettings({ period: value as PeriodSetting }),
    [updateSettings],
  );

  // [MEMORY MANAGEMENT] Callbacks únicos e estáveis compartilhados por todos os RouteCards.
  const handleToggleDetails = useCallback((key: string) => {
    setExpandedKey((current) => (current === key ? null : key));
  }, []);

  const handleStart = useCallback(
    (key: string) => navigation.navigate('AssistedNavigation', { routeKey: key }),
    [navigation],
  );

  /* -------------------------------- Lista ---------------------------------- */

  const recommendedKey = comparison.recommended?.key ?? null;

  const renderItem = useCallback<ListRenderItem<RouteEvaluation>>(
    ({ item, index }) => (
      <RouteCard
        evaluation={item}
        rank={index + 1}
        isRecommended={item.key === recommendedKey}
        isExpanded={item.key === expandedKey}
        onToggleDetails={handleToggleDetails}
        onStartNavigation={handleStart}
      />
    ),
    [recommendedKey, expandedKey, handleToggleDetails, handleStart],
  );

  const keyExtractor = useCallback((item: RouteEvaluation) => item.key, []);

  const resolvedPeriod = resolvePeriod(settings.period);
  const periodLabel = (p: PeriodSetting) =>
    p === 'auto' ? `Agora (${resolvedPeriod === 'noite' ? 'noite' : 'dia'})` : p === 'dia' ? 'Dia' : 'Noite';

  const origin = PLACES_BY_ID[originId];
  const destination = destinationId ? PLACES_BY_ID[destinationId] : undefined;

  // [MEMORY MANAGEMENT] Cabeçalho da lista memoizado: não é reconstruído ao expandir um card.
  const listHeader = useMemo(
    () => (
      <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
        <View
          style={[
            styles.form,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: theme.borderWidth,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.md,
            },
          ]}
        >
          <PickerField
            label="Origem"
            placeholder="Escolha a origem"
            modalTitle="De onde você sai?"
            icon="location"
            options={originOptions}
            selectedId={originId}
            onSelect={handleOrigin}
          />
          <View style={styles.swapRow}>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <IconButton
              icon="swap-vertical"
              accessibilityLabel="Inverter origem e destino"
              onPress={handleSwap}
              filled
            />
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          </View>
          <PickerField
            label="Destino"
            placeholder="Escolha o destino"
            modalTitle="Para onde você vai?"
            icon="flag"
            options={destinationOptions}
            selectedId={destinationId}
            onSelect={handleDestination}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="label">Perfil de mobilidade</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            accessibilityRole="radiogroup"
            contentContainerStyle={{ gap: theme.spacing.sm }}
          >
            {PROFILE_IDS.map((id) => (
              <FilterChip
                key={id}
                value={id}
                label={PROFILE_SHORT[id]}
                icon={PROFILES[id].icon}
                selected={settings.profile === id}
                onPress={handleProfile}
              />
            ))}
          </ScrollView>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="label">Horário da caminhada</AppText>
          <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: theme.spacing.sm }]}>
            {PERIOD_IDS.map((p) => (
              <FilterChip
                key={p}
                value={p}
                label={periodLabel(p)}
                icon={p === 'noite' ? 'moon' : p === 'dia' ? 'sunny' : 'time'}
                selected={settings.period === p}
                onPress={handlePeriod}
              />
            ))}
          </View>
        </View>

        {comparison.recommended ? (
          <View
            accessible
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Recomendação: ${comparison.recommended.route.name}. ${comparison.reasons.join(' ')}`}
            style={[
              styles.recommendation,
              {
                backgroundColor: theme.colors.surfaceAlt,
                borderColor: theme.colors.primary,
                borderWidth: theme.borderWidth + 1,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.lg,
                gap: theme.spacing.xs,
              },
            ]}
          >
            <View style={styles.recTitle}>
              <Ionicons name="star" size={22 * theme.fontScale} color={theme.colors.primary} />
              <AppText variant="title" style={styles.flex}>
                Recomendamos: {comparison.recommended.route.name}
              </AppText>
            </View>
            {comparison.reasons.map((reason) => (
              <View key={reason} style={styles.reasonRow}>
                <AppText variant="body" color="primary" weight="800">
                  •
                </AppText>
                <AppText variant="body" style={styles.flex}>
                  {reason}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {comparison.evaluations.length > 0 ? (
          <AppText variant="title" accessibilityRole="header">
            {comparison.evaluations.length} rotas comparadas
          </AppText>
        ) : null}
      </View>
    ),
    // periodLabel depende só de resolvedPeriod (já incluído nas deps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      theme,
      originOptions,
      originId,
      handleOrigin,
      handleSwap,
      destinationOptions,
      destinationId,
      handleDestination,
      settings.profile,
      settings.period,
      handleProfile,
      handlePeriod,
      resolvedPeriod,
      comparison,
    ],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <AppHeader
        title="Rotas acessíveis"
        subtitle={
          origin && destination ? `${origin.shortName} → ${destination.shortName}` : 'Escolha origem e destino'
        }
      />
      {/* [MEMORY MANAGEMENT] FlatList otimizada (poucos itens, mas cards pesados). */}
      <FlatList
        data={comparison.evaluations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={expandedKey}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyState
            icon="map"
            title="Nenhuma rota para este trajeto"
            message="Escolha outro destino. Trajetos disponíveis: Consolação ↔ HC, MASP ↔ CCSP e Theatro Municipal ↔ Sé."
          />
        }
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: {},
  swapRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  divider: { flex: 1, height: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  recommendation: {},
  recTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reasonRow: { flexDirection: 'row', gap: 8 },
});
