import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  AccessibleButton,
  AppHeader,
  AppText,
  FilterChip,
  PickerField,
  StatusBanner,
  type SelectOption,
} from '../components';
import { CATEGORIES, CATEGORY_LIST, SEVERITIES, SEVERITY_LIST } from '../data/catalog';
import { ROUTES } from '../data/routes';
import { SEGMENTS, SEGMENTS_BY_ID } from '../data/segments';
import { useAppActions } from '../context/AppDataContext';
import { useAppTheme } from '../context/ThemeContext';
import { useTimedMessage } from '../hooks/useTimedMessage';
import type { BarrierCategory, Severity } from '../types';
import type { MainTabParamList } from '../types/navigation';

/* ==========================================================================
 * Funcionalidade 2 — Reporte Colaborativo de Barreiras e Riscos Urbanos
 * ========================================================================== */

const MAX_DESCRIPTION = 280;

interface FormErrors {
  segment?: string;
  category?: string;
  reference?: string;
}

export function ReportScreen() {
  const { theme } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<MainTabParamList, 'Report'>>();
  const { reportBarrier } = useAppActions();
  const { message: feedbackMessage, show: showFeedback, clear: clearFeedback } = useTimedMessage(9000);

  const [segmentId, setSegmentId] = useState<string | null>(route.params?.segmentId ?? null);
  const [category, setCategory] = useState<BarrierCategory | null>(null);
  const [severity, setSeverity] = useState<Severity>('media');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [lastReportedSegment, setLastReportedSegment] = useState<string | null>(null);

  // Pré-preenche o trecho quando a tela é aberta a partir da navegação assistida.
  useEffect(() => {
    const incoming = route.params?.segmentId;
    if (incoming && SEGMENTS_BY_ID[incoming]) setSegmentId(incoming);
  }, [route.params?.segmentId]);

  // [MEMORY MANAGEMENT] Opções estáticas memoizadas uma única vez.
  const segmentOptions = useMemo<SelectOption[]>(
    () =>
      SEGMENTS.map((s) => ({
        id: s.id,
        title: s.street,
        subtitle: `${s.startLabel} → ${s.endLabel} · ${s.neighborhood}`,
        icon: s.kind === 'metro' ? 'train' : 'walk',
      })),
    [],
  );

  const affectedRoutes = useMemo(() => {
    if (!lastReportedSegment) return [];
    return ROUTES.filter((r) => r.steps.some((s) => s.segmentId === lastReportedSegment)).map((r) => r.name);
  }, [lastReportedSegment]);

  /* ------------------------------- Handlers -------------------------------- */

  const handleSegment = useCallback((id: string) => {
    setSegmentId(id);
    setErrors((e) => ({ ...e, segment: undefined }));
  }, []);

  const handleCategory = useCallback((value: string) => {
    setCategory(value as BarrierCategory);
    setErrors((e) => ({ ...e, category: undefined }));
  }, []);

  const handleSeverity = useCallback((value: string) => setSeverity(value as Severity), []);

  const resetForm = useCallback(() => {
    setCategory(null);
    setSeverity('media');
    setReference('');
    setDescription('');
    setErrors({});
  }, []);

  const handleSubmit = useCallback(() => {
    const nextErrors: FormErrors = {};
    if (!segmentId) nextErrors.segment = 'Escolha o trecho onde está o problema.';
    if (!category) nextErrors.category = 'Escolha o tipo de problema.';
    if (reference.trim().length < 3) nextErrors.reference = 'Informe um endereço ou ponto de referência.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !segmentId || !category) {
      showFeedback('Confira os campos destacados antes de enviar.', 'danger');
      return;
    }

    const result = reportBarrier({ segmentId, category, severity, reference, description });
    setLastReportedSegment(segmentId);
    showFeedback(
      result.merged
        ? `Já existia um alerta de ${CATEGORIES[category].label.toLowerCase()} neste trecho. Seu reporte foi somado como confirmação.`
        : 'Reporte enviado! As notas das rotas que passam por este trecho já foram recalculadas.',
      'success',
    );
    resetForm();
  }, [segmentId, category, severity, reference, description, reportBarrier, showFeedback, resetForm]);

  const goToAlerts = useCallback(
    () => navigation.navigate('Main', { screen: 'Alerts', params: { segmentId: lastReportedSegment ?? undefined } }),
    [navigation, lastReportedSegment],
  );

  const goToRoutes = useCallback(() => navigation.navigate('Main', { screen: 'Routes' }), [navigation]);

  const inputStyle = useMemo(
    () => [
      theme.typography.bodyLarge,
      {
        minHeight: theme.touchTarget + 8,
        color: theme.colors.text,
        backgroundColor: theme.colors.surface,
        borderWidth: theme.borderWidth + 1,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      },
    ],
    [theme],
  );

  const selectedSeverity = SEVERITIES[severity];

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Reportar barreira" subtitle="Leva menos de 1 minuto e ajuda quem passa depois" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}
        >
          {feedbackMessage ? (
            <StatusBanner text={feedbackMessage.text} tone={feedbackMessage.tone} onDismiss={clearFeedback} />
          ) : null}

          {affectedRoutes.length > 0 ? (
            <View
              style={{
                gap: theme.spacing.sm,
                padding: theme.spacing.lg,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: theme.borderWidth,
                borderRadius: theme.radius.lg,
              }}
            >
              <AppText variant="label">Rotas afetadas pelo seu último reporte</AppText>
              <AppText variant="body">{affectedRoutes.join(' · ')}</AppText>
              <View style={[styles.row, { gap: theme.spacing.sm }]}>
                <AccessibleButton label="Ver no feed" icon="list" variant="secondary" onPress={goToAlerts} style={styles.flex} />
                <AccessibleButton label="Ver rotas" icon="map" variant="secondary" onPress={goToRoutes} style={styles.flex} />
              </View>
            </View>
          ) : null}

          {/* 1. Onde */}
          <View style={{ gap: theme.spacing.xs }}>
            <PickerField
              label="1. Onde está o problema?"
              placeholder="Escolha o trecho"
              modalTitle="Escolha o trecho"
              icon="trail-sign"
              options={segmentOptions}
              selectedId={segmentId}
              onSelect={handleSegment}
              searchable
            />
            {errors.segment ? (
              <AppText variant="caption" color="danger" weight="700" accessibilityLiveRegion="polite">
                {errors.segment}
              </AppText>
            ) : null}
          </View>

          {/* 2. Tipo */}
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label" accessibilityRole="header">
              2. Qual é o problema?
            </AppText>
            <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: theme.spacing.sm }]}>
              {CATEGORY_LIST.map((c) => (
                <FilterChip
                  key={c.id}
                  value={c.id}
                  label={c.label}
                  icon={c.icon}
                  selected={category === c.id}
                  onPress={handleCategory}
                  accessibilityHint={c.description}
                />
              ))}
            </View>
            {category ? (
              <AppText variant="caption" color="textMuted">
                {CATEGORIES[category].description}
              </AppText>
            ) : null}
            {errors.category ? (
              <AppText variant="caption" color="danger" weight="700" accessibilityLiveRegion="polite">
                {errors.category}
              </AppText>
            ) : null}
          </View>

          {/* 3. Gravidade */}
          <View style={{ gap: theme.spacing.sm }}>
            <AppText variant="label" accessibilityRole="header">
              3. Qual a gravidade?
            </AppText>
            <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: theme.spacing.sm }]}>
              {SEVERITY_LIST.map((s) => (
                <FilterChip
                  key={s.id}
                  value={s.id}
                  label={s.label}
                  icon={s.icon}
                  selected={severity === s.id}
                  onPress={handleSeverity}
                  accessibilityHint={s.description}
                />
              ))}
            </View>
            <AppText variant="body" color="textMuted">
              {selectedSeverity.label}: {selectedSeverity.description}
            </AppText>
          </View>

          {/* 4. Referência */}
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="label" nativeID="referenceLabel">
              4. Endereço ou ponto de referência
            </AppText>
            <TextInput
              value={reference}
              onChangeText={setReference}
              placeholder="Ex.: em frente ao nº 180, esquina com a Rua X"
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="Endereço ou ponto de referência, obrigatório"
              accessibilityLabelledBy="referenceLabel"
              maxLength={120}
              style={[inputStyle, { borderColor: errors.reference ? theme.colors.danger : theme.colors.border }]}
            />
            {errors.reference ? (
              <AppText variant="caption" color="danger" weight="700" accessibilityLiveRegion="polite">
                {errors.reference}
              </AppText>
            ) : null}
          </View>

          {/* 5. Detalhes */}
          <View style={{ gap: theme.spacing.xs }}>
            <AppText variant="label" nativeID="descriptionLabel">
              5. Detalhes (opcional)
            </AppText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Descreva o que outras pessoas precisam saber"
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel="Detalhes do problema, opcional"
              accessibilityLabelledBy="descriptionLabel"
              multiline
              maxLength={MAX_DESCRIPTION}
              textAlignVertical="top"
              style={[inputStyle, styles.multiline, { borderColor: theme.colors.border }]}
            />
            <AppText variant="caption" color="textMuted" align="right">
              {description.length}/{MAX_DESCRIPTION}
            </AppText>
          </View>

          <AccessibleButton
            label="Enviar reporte"
            icon="send"
            size="xl"
            fullWidth
            onPress={handleSubmit}
            accessibilityHint="Publica o alerta e recalcula as rotas que passam pelo trecho"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  multiline: { minHeight: 110 },
});
