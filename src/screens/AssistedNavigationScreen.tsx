import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  FlatList,
  Linking,
  Modal,
  Share,
  StyleSheet,
  Vibration,
  View,
  type ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AccessibleButton,
  AppHeader,
  AppText,
  EmptyState,
  IconButton,
  NavigationStepItem,
  StatusBanner,
  type StepStatus,
} from '../components';
import { CATEGORIES, EMERGENCY_NUMBERS } from '../data/catalog';
import { PLACES_BY_ID } from '../data/places';
import { useAppActions, useAppState } from '../context/AppDataContext';
import { useAppTheme } from '../context/ThemeContext';
import { useRouteEvaluation } from '../hooks/useRouteData';
import { useSpeech } from '../hooks/useSpeech';
import { useTimedMessage } from '../hooks/useTimedMessage';
import type { AlertInsight, SegmentEvaluation, SupportRequestKind } from '../types';
import type { RootStackParamList } from '../types/navigation';
import {
  buildArrivalAnnouncement,
  buildHazardAnnouncement,
  buildRouteIntro,
  buildStepAnnouncement,
} from '../utils/announcements';
import { formatDistance, formatSpokenDistance } from '../utils/format';
import { alertPositionRatio } from '../utils/scoring';

/* ==========================================================================
 * Funcionalidade 4 — Modo Navegação Assistida (Acessibilidade Ativa)
 *
 * Sem GPS: o deslocamento é SIMULADO (acelerado) para demonstrar avisos de
 * proximidade. Em produção, o progresso viria do expo-location.
 * ========================================================================== */

/** Aceleração da simulação: 1 s de tela = 12 s de caminhada. */
const SIM_SPEEDUP = 12;
const TICK_MS = 1000;
/** Distância (m) a partir da qual o obstáculo é anunciado. */
const HAZARD_WARNING_DISTANCE = 60;

interface UpcomingHazard {
  key: string;
  insight: AlertInsight;
  metersAhead: number;
}

/** Posição do alerta (m desde o início do trecho, no sentido percorrido). */
function hazardPosition(step: SegmentEvaluation, insight: AlertInsight): number {
  const pos = alertPositionRatio(insight.alert.id) * step.segment.distanceM;
  return step.reversed ? step.segment.distanceM - pos : pos;
}

export function AssistedNavigationScreen() {
  const { theme, screenReaderEnabled } = useAppTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'AssistedNavigation'>>();
  const { settings } = useAppState();
  const { updateSettings, registerSupportRequest } = useAppActions();
  const evaluation = useRouteEvaluation(route.params.routeKey);
  const { speak, stop, isSpeaking } = useSpeech({ enabled: settings.voiceEnabled, rate: settings.speechRate });
  const { message, show, clear } = useTimedMessage(8000);

  const [stepIndex, setStepIndex] = useState(0);
  const [progressM, setProgressM] = useState(0);
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  const steps = useMemo(() => evaluation?.segments ?? [], [evaluation]);
  const total = steps.length;
  const current: SegmentEvaluation | undefined = steps[stepIndex];
  const stepDistance = current?.segment.distanceM ?? 0;
  // Velocidade efetiva do trecho (m/s), coerente com o tempo estimado (inclusive metrô).
  const stepSpeed = current ? current.segment.distanceM / Math.max(60, current.durationMin * 60) : 1;

  // Refs com valores atuais: evitam recriar efeitos/intervalos a cada render.
  const spokenHazardsRef = useRef(new Set<string>());
  const introDoneRef = useRef(false);
  const evaluationRef = useRef(evaluation);
  evaluationRef.current = evaluation;

  /** Fala (expo-speech) ou, com a voz desligada, anuncia pelo leitor de tela. */
  const announce = useCallback(
    (text: string, interrupt = true) => {
      if (settings.voiceEnabled) speak(text, { interrupt });
      else if (screenReaderEnabled) AccessibilityInfo.announceForAccessibility(text);
    },
    [settings.voiceEnabled, speak, screenReaderEnabled],
  );

  /* ------------------------ Anúncio de cada passo -------------------------- */

  useEffect(() => {
    const ev = evaluationRef.current;
    if (!ev || finished) return;
    const step = ev.segments[stepIndex];
    if (!step) return;
    const stepText = buildStepAnnouncement(step, stepIndex, ev.segments.length);
    if (!introDoneRef.current) {
      introDoneRef.current = true;
      announce(`${buildRouteIntro(ev)} ${stepText}`);
    } else {
      announce(stepText);
    }
    // Só re-anuncia quando o passo muda (não quando a nota da rota é recalculada).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  /* ----------------------- Simulação do deslocamento ----------------------- */

  // [MEMORY MANAGEMENT] Interval recriado só ao pausar/trocar de passo e SEMPRE limpo
  // no cleanup (inclusive ao sair da tela) — sem timers órfãos rodando em background.
  useEffect(() => {
    if (!running || finished || stepDistance <= 0) return;
    const id = setInterval(() => {
      setProgressM((p) => Math.min(p + stepSpeed * SIM_SPEEDUP, stepDistance));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, finished, stepIndex, stepSpeed, stepDistance]);

  // Conclusão do passo → próximo passo ou chegada.
  useEffect(() => {
    if (finished || stepDistance <= 0 || progressM < stepDistance) return;
    if (stepIndex < total - 1) {
      setStepIndex((i) => i + 1);
      setProgressM(0);
    } else {
      setFinished(true);
      setRunning(false);
      const ev = evaluationRef.current;
      if (ev) announce(buildArrivalAnnouncement(ev));
      Vibration.vibrate([0, 200, 120, 200]);
    }
  }, [progressM, stepDistance, stepIndex, total, finished, announce]);

  /* ------------------- Avisos de obstáculos por proximidade ---------------- */

  const upcomingHazards = useMemo<UpcomingHazard[]>(() => {
    if (!current) return [];
    const list: UpcomingHazard[] = current.activeAlerts.map((insight) => ({
      key: `${stepIndex}:${insight.alert.id}`,
      insight,
      metersAhead: hazardPosition(current, insight) - progressM,
    }));
    const next = steps[stepIndex + 1];
    if (next) {
      const remaining = stepDistance - progressM;
      for (const insight of next.activeAlerts) {
        list.push({
          key: `${stepIndex + 1}:${insight.alert.id}`,
          insight,
          metersAhead: remaining + hazardPosition(next, insight),
        });
      }
    }
    return list.sort((a, b) => a.metersAhead - b.metersAhead);
  }, [current, steps, stepIndex, stepDistance, progressM]);

  useEffect(() => {
    if (!running || finished) return;
    for (const hazard of upcomingHazards) {
      if (hazard.metersAhead < 0 || hazard.metersAhead > HAZARD_WARNING_DISTANCE) continue;
      if (spokenHazardsRef.current.has(hazard.key)) continue;
      spokenHazardsRef.current.add(hazard.key);
      const meters = Math.max(10, Math.round(hazard.metersAhead / 10) * 10);
      const text = buildHazardAnnouncement(hazard.insight, meters);
      announce(text, false);
      show(text, 'danger');
      Vibration.vibrate(hazard.insight.alert.severity === 'critica' ? [0, 400, 150, 400] : 300);
    }
  }, [upcomingHazards, running, finished, announce, show]);

  // [MEMORY MANAGEMENT] Ao desmontar: cancela vibração em andamento. A fala é
  // interrompida pelo useSpeech (Speech.stop) e o interval pelo cleanup acima.
  useEffect(() => () => Vibration.cancel(), []);

  /* -------------------------------- Ações ---------------------------------- */

  const goToStep = useCallback(
    (index: number) => {
      if (index < 0 || index >= total) return;
      // Permite ouvir de novo os avisos do passo para onde o usuário voltou.
      for (const key of Array.from(spokenHazardsRef.current)) {
        if (key.startsWith(`${index}:`)) spokenHazardsRef.current.delete(key);
      }
      setFinished(false);
      setProgressM(0);
      if (index === stepIndex) {
        const ev = evaluationRef.current;
        if (ev?.segments[index]) announce(buildStepAnnouncement(ev.segments[index], index, ev.segments.length));
      } else {
        setStepIndex(index);
      }
    },
    [total, stepIndex, announce],
  );

  const handleRepeat = useCallback(() => {
    if (!current) return;
    const remaining = Math.max(0, stepDistance - progressM);
    const extra = current.segment.kind === 'metro' ? '' : ` Faltam cerca de ${formatSpokenDistance(remaining)} neste trecho.`;
    announce(`${buildStepAnnouncement(current, stepIndex, total)}${extra}`);
  }, [current, stepDistance, progressM, stepIndex, total, announce]);

  const handleToggleRunning = useCallback(() => {
    const next = !running;
    setRunning(next);
    announce(next ? 'Navegação retomada.' : 'Navegação pausada.');
  }, [running, announce]);

  const handlePrev = useCallback(() => goToStep(stepIndex - 1), [goToStep, stepIndex]);
  const handleNext = useCallback(() => goToStep(stepIndex + 1), [goToStep, stepIndex]);
  const handleStepPress = useCallback((index: number) => goToStep(index), [goToStep]);

  const toggleVoice = useCallback(() => {
    if (settings.voiceEnabled) stop();
    updateSettings({ voiceEnabled: !settings.voiceEnabled });
    AccessibilityInfo.announceForAccessibility(settings.voiceEnabled ? 'Voz desligada' : 'Voz ligada');
  }, [settings.voiceEnabled, stop, updateSettings]);

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  /* ---------------------------- Emergência/apoio --------------------------- */

  const locationLabel = current ? `${current.segment.street} (${current.fromLabel} → ${current.toLabel})` : 'Local desconhecido';
  const routeName = evaluation?.route.name ?? 'Rota';

  const openEmergency = useCallback(() => {
    setRunning(false);
    setEmergencyOpen(true);
    Vibration.vibrate(150);
  }, []);
  const closeEmergency = useCallback(() => setEmergencyOpen(false), []);

  const register = useCallback(
    (kind: SupportRequestKind) => registerSupportRequest({ kind, routeName, locationLabel }),
    [registerSupportRequest, routeName, locationLabel],
  );

  const handleRequestSupport = useCallback(() => {
    register('apoio');
    setEmergencyOpen(false);
    const text =
      'Pedido de apoio registrado. Fique em um local seguro e visível. Se for uma emergência, ligue 192 para o SAMU ou 190 para a Polícia Militar.';
    announce(text);
    show('Pedido de apoio registrado no aparelho.', 'success');
    Vibration.vibrate([0, 300, 150, 300]);
  }, [register, announce, show]);

  const handleShare = useCallback(async () => {
    register('apoio');
    setEmergencyOpen(false);
    const destination = evaluation ? PLACES_BY_ID[evaluation.destinationId]?.shortName : undefined;
    try {
      await Share.share({
        message:
          `Preciso de apoio. Estou em: ${locationLabel}. ` +
          `Indo para ${destination ?? 'meu destino'} pela rota "${routeName}". ` +
          'Enviado pelo app Rotas Acessíveis SP.',
      });
    } catch {
      show('Não foi possível abrir o compartilhamento.', 'danger');
    }
  }, [register, evaluation, locationLabel, routeName, show]);

  const callNumber = useCallback(
    async (number: string) => {
      register('emergencia');
      setEmergencyOpen(false);
      try {
        await Linking.openURL(`tel:${number}`);
      } catch {
        show(`Não foi possível abrir o discador. Ligue ${number} manualmente.`, 'danger');
      }
    },
    [register, show],
  );
  const callSamu = useCallback(() => callNumber(EMERGENCY_NUMBERS.samu), [callNumber]);
  const callPolice = useCallback(() => callNumber(EMERGENCY_NUMBERS.policiaMilitar), [callNumber]);

  const reportHere = useCallback(() => {
    setEmergencyOpen(false);
    navigation.navigate('Main', { screen: 'Report', params: { segmentId: current?.segment.id } });
  }, [navigation, current]);

  /* -------------------------------- Lista ---------------------------------- */

  const renderItem = useCallback<ListRenderItem<SegmentEvaluation>>(
    ({ item, index }) => {
      const status: StepStatus = finished || index < stepIndex ? 'feito' : index === stepIndex ? 'atual' : 'proximo';
      return <NavigationStepItem step={item} index={index} total={total} status={status} onPress={handleStepPress} />;
    },
    [finished, stepIndex, total, handleStepPress],
  );

  const keyExtractor = useCallback((item: SegmentEvaluation, index: number) => `${item.segment.id}-${index}`, []);

  if (!evaluation || !current) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Navegação assistida" onBack={goBack} />
        <EmptyState icon="map" title="Rota não encontrada" message="Volte e escolha uma rota novamente." actionLabel="Voltar" onAction={goBack} />
      </View>
    );
  }

  const percent = stepDistance > 0 ? Math.round((progressM / stepDistance) * 100) : 0;
  const remaining = Math.max(0, stepDistance - progressM);
  const destination = PLACES_BY_ID[evaluation.destinationId];

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      {message ? <StatusBanner text={message.text} tone={message.tone} onDismiss={clear} /> : null}

      {finished ? (
        <View
          accessible
          accessibilityLiveRegion="assertive"
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.success,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.xl,
              gap: theme.spacing.sm,
              borderColor: theme.colors.border,
              borderWidth: theme.isHighContrast ? theme.borderWidth : 0,
            },
          ]}
        >
          <Ionicons name="flag" size={40 * theme.fontScale} color={theme.colors.onSuccess} />
          <AppText variant="headline" colorValue={theme.colors.onSuccess}>
            Você chegou: {destination?.shortName}
          </AppText>
          <AppText variant="bodyLarge" colorValue={theme.colors.onSuccess}>
            {destination?.arrivalTip}
          </AppText>
        </View>
      ) : (
        <View
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: current.isCritical ? theme.colors.danger : theme.colors.primary,
              borderWidth: theme.borderWidth + 2,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              gap: theme.spacing.sm,
            },
          ]}
        >
          <View style={styles.panelTop}>
            <AppText variant="label" color="primary" style={styles.flex}>
              PASSO {stepIndex + 1} DE {total}
              {current.isCritical ? '  ·  TRECHO CRÍTICO' : ''}
            </AppText>
            <IconButton
              icon={settings.voiceEnabled ? 'volume-high' : 'volume-mute'}
              accessibilityLabel={settings.voiceEnabled ? 'Desligar voz' : 'Ligar voz'}
              onPress={toggleVoice}
              filled={settings.voiceEnabled}
            />
          </View>
          <AppText variant="headline" accessibilityRole="header" accessibilityLiveRegion="polite">
            {current.instruction}
          </AppText>

          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel={`Progresso do passo: ${percent} por cento. Faltam ${formatDistance(remaining)}.`}
            accessibilityValue={{ min: 0, max: 100, now: percent }}
            style={{ gap: theme.spacing.xs }}
          >
            <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border, borderWidth: theme.isHighContrast ? 1 : 0 }]}>
              <View style={[styles.fill, { width: `${Math.max(3, percent)}%`, backgroundColor: theme.colors.primary }]} />
            </View>
            <AppText variant="bodyLarge" weight="700">
              {current.segment.kind === 'metro' ? `Viagem de metrô · ${percent}%` : `Faltam ${formatDistance(remaining)} neste trecho`}
            </AppText>
          </View>

          <AppText variant="body" color="textMuted">
            {current.segment.guidance}
          </AppText>

          {upcomingHazards.filter((h) => h.metersAhead >= 0).length > 0 ? (
            <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
              <AppText variant="label" color="danger">
                Obstáculos à frente
              </AppText>
              {upcomingHazards
                .filter((h) => h.metersAhead >= 0)
                .slice(0, 3)
                .map((h) => (
                  <View key={h.key} style={styles.hazardRow}>
                    <Ionicons name={CATEGORIES[h.insight.alert.category].icon} size={22 * theme.fontScale} color={theme.colors.danger} />
                    <AppText variant="body" style={styles.flex}>
                      {CATEGORIES[h.insight.alert.category].label} em {formatDistance(h.metersAhead)} — {h.insight.alert.reference}
                    </AppText>
                  </View>
                ))}
            </View>
          ) : null}

          <AppText variant="caption" color="textMuted">
            {isSpeaking ? 'Falando…' : 'Simulação acelerada (sem GPS) para demonstração.'}
          </AppText>
        </View>
      )}

      <View style={[styles.controls, { gap: theme.spacing.sm }]}>
        <AccessibleButton label="Repetir" icon="refresh" size="lg" variant="secondary" onPress={handleRepeat} style={styles.flex} accessibilityLabel="Repetir instrução em voz alta" disabled={finished} />
        <AccessibleButton
          label={running ? 'Pausar' : 'Continuar'}
          icon={running ? 'pause' : 'play'}
          size="lg"
          variant="primary"
          onPress={handleToggleRunning}
          style={styles.flex}
          disabled={finished}
        />
      </View>
      <View style={[styles.controls, { gap: theme.spacing.sm }]}>
        <AccessibleButton label="Anterior" icon="arrow-back" size="lg" variant="secondary" onPress={handlePrev} disabled={stepIndex === 0} style={styles.flex} accessibilityLabel="Passo anterior" />
        <AccessibleButton label="Próximo" icon="arrow-forward" size="lg" variant="secondary" onPress={handleNext} disabled={stepIndex >= total - 1} style={styles.flex} accessibilityLabel="Próximo passo" />
      </View>

      <AccessibleButton
        label="ALERTA RÁPIDO · PEDIR APOIO"
        icon="alert-circle"
        size="xl"
        variant="danger"
        fullWidth
        onPress={openEmergency}
        accessibilityHint="Abre opções de ajuda: pedir apoio, avisar um contato ou ligar para emergência"
      />

      <AppText variant="title" accessibilityRole="header">
        Todos os passos
      </AppText>
    </View>
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Navegação assistida" subtitle={routeName} onBack={goBack} />
      {/* [MEMORY MANAGEMENT] FlatList com itens memoizados: a cada tick de 1 s só o
          cabeçalho muda; os passos só re-renderizam quando o status deles muda. */}
      <FlatList
        data={steps}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        extraData={`${stepIndex}-${finished}`}
        ListHeaderComponent={header}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: insets.bottom + theme.spacing.xxl }}
      />

      <Modal visible={emergencyOpen} transparent animationType="fade" onRequestClose={closeEmergency}>
        <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: theme.borderWidth,
                borderTopLeftRadius: theme.radius.lg,
                borderTopRightRadius: theme.radius.lg,
                padding: theme.spacing.lg,
                paddingBottom: insets.bottom + theme.spacing.lg,
                gap: theme.spacing.sm,
              },
            ]}
          >
            <AppText variant="headline" accessibilityRole="header">
              Precisa de ajuda?
            </AppText>
            <AppText variant="body" color="textMuted">
              Você está em: {locationLabel}
            </AppText>
            <AccessibleButton label="Pedir apoio" icon="hand-left" size="lg" variant="primary" fullWidth onPress={handleRequestSupport} accessibilityHint="Registra o pedido e dá orientações por voz" />
            <AccessibleButton label="Avisar um contato" icon="share-social" size="lg" variant="secondary" fullWidth onPress={handleShare} accessibilityHint="Envia sua localização na rota por mensagem" />
            <AccessibleButton label={`Ligar SAMU ${EMERGENCY_NUMBERS.samu}`} icon="medkit" size="lg" variant="danger" fullWidth onPress={callSamu} />
            <AccessibleButton label={`Ligar Polícia ${EMERGENCY_NUMBERS.policiaMilitar}`} icon="call" size="lg" variant="danger" fullWidth onPress={callPolice} />
            <AccessibleButton label="Reportar barreira aqui" icon="megaphone" size="lg" variant="secondary" fullWidth onPress={reportHere} />
            <AccessibleButton label="Cancelar" icon="close" size="lg" variant="ghost" fullWidth onPress={closeEmergency} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  panel: {},
  panelTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 14, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  hazardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  controls: { flexDirection: 'row' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {},
});
