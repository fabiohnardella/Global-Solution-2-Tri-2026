import { CATEGORIES, RESOLVE_MIN_VOTES, SEVERITIES } from '../data/catalog';
import { PLACES_BY_ID } from '../data/places';
import { ROUTES, ROUTES_BY_ID } from '../data/routes';
import { SEGMENTS_BY_ID, segmentLabel } from '../data/segments';
import type {
  AlertFeedItem,
  AlertInsight,
  CommunityAlert,
  DayPeriod,
  MobilityProfile,
  PeriodSetting,
  RouteComparison,
  RouteDef,
  RouteEvaluation,
  RouteStepDef,
  RouteWarning,
  ScoreLevel,
  Segment,
  SegmentEvaluation,
} from '../types';
import { formatDuration } from './format';

/* ==========================================================================
 * Motor de pontuação de rotas — funções PURAS (sem estado, sem efeitos).
 * Por serem puras, podem ser memoizadas com segurança via useMemo.
 * ========================================================================== */

const HOUR_MS = 60 * 60 * 1000;

export interface ScoringContext {
  profile: MobilityProfile;
  period: DayPeriod;
  now: number;
}

const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value));
const clamp01 = (value: number): number => clamp(value, 0, 1);
const round = (value: number): number => Math.round(value);

/* ------------------------------ Período ----------------------------------- */

export function resolvePeriod(setting: PeriodSetting, date: Date = new Date()): DayPeriod {
  if (setting !== 'auto') return setting;
  const hour = date.getHours();
  return hour >= 18 || hour < 6 ? 'noite' : 'dia';
}

/* ------------------------------ Níveis ------------------------------------ */

export const SCORE_LEVEL_LABEL: Record<ScoreLevel, string> = {
  otimo: 'Ótimo',
  bom: 'Bom',
  regular: 'Regular',
  critico: 'Crítico',
};

export function scoreLevel(score: number): ScoreLevel {
  if (score >= 80) return 'otimo';
  if (score >= 65) return 'bom';
  if (score >= 45) return 'regular';
  return 'critico';
}

/* --------------------------- Alertas da comunidade ------------------------ */

/** Confiança bayesiana simples (Laplace): confirmações vs. votos de resolvido. */
export function alertConfidence(alert: CommunityAlert): number {
  return (alert.confirmations + 1) / (alert.confirmations + alert.resolvedVotes + 2);
}

/** Relevância 0–100: gravidade × confiança × atualidade + bônus por confirmações. */
export function alertRelevance(alert: CommunityAlert, now: number): number {
  if (alert.status === 'resolvido') return 0;
  const severity = SEVERITIES[alert.severity];
  const hoursSinceConfirmation = Math.max(0, (now - new Date(alert.lastConfirmedAt).getTime()) / HOUR_MS);
  // Meia-vida de ~1 semana: um alerta não confirmado perde força, mas nunca some sozinho.
  const freshness = 0.4 + 0.6 * Math.exp(-hoursSinceConfirmation / 168);
  const confidence = alertConfidence(alert);
  const confirmationBonus = Math.min(alert.confirmations, 10) * 2;
  return round(clamp(severity.relevanceWeight * freshness * (0.35 + 0.65 * confidence) + confirmationBonus));
}

export function buildAlertInsight(alert: CommunityAlert, now: number): AlertInsight {
  return { alert, relevance: alertRelevance(alert, now), confidence: alertConfidence(alert) };
}

/** Regra de encerramento coletivo: votos suficientes e mais votos de resolvido que confirmações. */
export function shouldAutoResolve(alert: CommunityAlert): boolean {
  return alert.resolvedVotes >= RESOLVE_MIN_VOTES && alert.resolvedVotes > alert.confirmations;
}

/** Índice segmentId → alertas ativos (construído uma vez por mudança na lista). */
export function groupActiveAlertsBySegment(alerts: CommunityAlert[]): Map<string, CommunityAlert[]> {
  const map = new Map<string, CommunityAlert[]>();
  for (const alert of alerts) {
    if (alert.status !== 'ativo') continue;
    const list = map.get(alert.segmentId);
    if (list) list.push(alert);
    else map.set(alert.segmentId, [alert]);
  }
  return map;
}

/** Posição estimada do alerta dentro do trecho (0–1), estável por id. */
export function alertPositionRatio(alertId: string): number {
  let hash = 0;
  for (let i = 0; i < alertId.length; i += 1) {
    hash = (hash * 31 + alertId.charCodeAt(i)) % 9973;
  }
  return 0.25 + (hash % 50) / 100; // entre 25% e 74% do trecho
}

/* --------------------------- Notas-base do trecho ------------------------- */

function widthFactor(widthM: number, minComfortWidth: number): number {
  const low = 0.8; // abaixo disso uma cadeira de rodas não passa
  const high = Math.max(minComfortWidth + 0.3, 1.5);
  return clamp01((widthM - low) / (high - low));
}

function slopeFactor(slopePercent: number, maxComfortSlope: number): number {
  return clamp01(1 - slopePercent / (2 * maxComfortSlope));
}

function baseAccessibility(segment: Segment, profile: MobilityProfile): number {
  const w = profile.accessibilityWeights;
  const a = segment.accessibility;
  const raw =
    w.ramp * a.rampCoverage +
    w.tactile * a.tactileCoverage +
    w.width * widthFactor(a.sidewalkWidthM, profile.minComfortWidth) +
    w.slope * slopeFactor(a.slopePercent, profile.maxComfortSlope);
  const totalWeight = w.ramp + w.tactile + w.width + w.slope;
  return (raw / totalWeight) * 100;
}

function baseSafety(segment: Segment, period: DayPeriod): number {
  const s = segment.safety;
  const incidentFactor = clamp01(1 - s.incidents90d / 20);
  const weights =
    period === 'noite'
      ? { lighting: 0.45, flow: 0.25, incidents: 0.3 }
      : { lighting: 0.25, flow: 0.35, incidents: 0.4 };
  return (weights.lighting * s.lighting + weights.flow * s.pedestrianFlow + weights.incidents * incidentFactor) * 100;
}

/* ------------------------------ Instruções -------------------------------- */

export function buildInstruction(
  segment: Segment,
  reversed: boolean,
): { fromLabel: string; toLabel: string; instruction: string } {
  const fromLabel = reversed ? segment.endLabel : segment.startLabel;
  const toLabel = reversed ? segment.startLabel : segment.endLabel;
  const via = segment.streetArticle === 'o' ? 'pelo' : 'pela';
  let instruction: string;
  switch (segment.kind) {
    case 'metro':
      instruction = `Embarque no ${segment.street} na ${fromLabel} e desembarque na ${toLabel}.`;
      break;
    case 'travessia':
      instruction = `Atravesse ${segment.streetArticle} ${segment.street}, de ${fromLabel} para ${toLabel}.`;
      break;
    default:
      instruction = `Siga ${via} ${segment.street}, de ${fromLabel} até ${toLabel}.`;
  }
  return { fromLabel, toLabel, instruction };
}

/* --------------------------- Alertas estruturais -------------------------- */

interface StructuralWarning {
  message: string;
  critical: boolean;
}

function structuralWarnings(segment: Segment, profile: MobilityProfile, period: DayPeriod): StructuralWarning[] {
  if (segment.kind === 'metro') return [];
  const a = segment.accessibility;
  const s = segment.safety;
  const out: StructuralWarning[] = [];
  const slopeText = a.slopePercent.toFixed(1).replace('.', ',');
  const widthText = a.sidewalkWidthM.toFixed(1).replace('.', ',');

  if ((profile.id === 'cadeirante' || profile.id === 'idoso') && a.slopePercent > profile.maxComfortSlope * 0.6) {
    out.push({
      message: `Inclinação de ${slopeText}% (recomendado até ${profile.maxComfortSlope.toFixed(1).replace('.', ',')}%).`,
      critical: a.slopePercent > profile.maxComfortSlope,
    });
  }
  if (a.sidewalkWidthM < profile.minComfortWidth + 0.3) {
    out.push({
      message: `Calçada estreita: ${widthText} m de faixa livre.`,
      critical: a.sidewalkWidthM < profile.minComfortWidth,
    });
  }
  if (profile.id === 'cadeirante' && a.rampCoverage < 0.6) {
    out.push({
      message: `Rampas em apenas ${round(a.rampCoverage * 100)}% das travessias.`,
      critical: a.rampCoverage <= 0.5,
    });
  }
  if (profile.id === 'deficiencia_visual' && a.tactileCoverage < 0.4) {
    out.push({
      message: `Piso tátil em apenas ${round(a.tactileCoverage * 100)}% do trecho.`,
      critical: a.tactileCoverage < 0.25,
    });
  }
  if (period === 'noite' && s.lighting < 0.65) {
    out.push({ message: 'Iluminação deficiente à noite.', critical: s.lighting < 0.55 });
  }
  if (s.incidents90d >= 12) {
    out.push({
      message: `Histórico elevado de ocorrências (${s.incidents90d} em 90 dias).`,
      critical: period === 'noite' && s.incidents90d >= 15,
    });
  }
  return out;
}

/* ---------------------------- Avaliação do trecho ------------------------- */

export function evaluateSegment(
  segment: Segment,
  reversed: boolean,
  segmentAlerts: CommunityAlert[],
  ctx: ScoringContext,
): SegmentEvaluation {
  const { profile, period, now } = ctx;
  const { fromLabel, toLabel, instruction } = buildInstruction(segment, reversed);

  const activeAlerts = segmentAlerts
    .map((alert) => buildAlertInsight(alert, now))
    .sort((a, b) => b.relevance - a.relevance);

  let accessibilityPenalty = 0;
  let safetyPenalty = 0;
  const warnings: RouteWarning[] = [];
  let hasCriticalAlert = false;

  for (const insight of activeAlerts) {
    const { alert, confidence } = insight;
    const category = CATEGORIES[alert.category];
    const severity = SEVERITIES[alert.severity];
    const sensitivity = profile.categorySensitivity[alert.category] ?? 1;
    const base = severity.penalty * sensitivity * (0.4 + 0.6 * confidence);
    // Poste apagado pesa mais à noite e menos durante o dia.
    const lightingFactor = alert.category === 'poste_apagado' ? (period === 'noite' ? 1.5 : 0.5) : 1;

    accessibilityPenalty += base * category.impact.accessibility;
    safetyPenalty += base * category.impact.safety * lightingFactor;

    const isSevere = (alert.severity === 'alta' || alert.severity === 'critica') && confidence >= 0.5;
    if (isSevere) hasCriticalAlert = true;

    warnings.push({
      id: alert.id,
      segmentId: segment.id,
      severity: alert.severity,
      message: `${category.label} (${severity.label.toLowerCase()}): ${alert.reference}`,
    });
  }

  const structural = structuralWarnings(segment, profile, period);
  structural.forEach((w, index) => {
    warnings.push({
      id: `${segment.id}-estrutural-${index}`,
      segmentId: segment.id,
      severity: 'estrutural',
      message: w.message,
    });
  });

  const accessibilityScore = round(clamp(baseAccessibility(segment, profile) - accessibilityPenalty));
  const safetyScore = round(clamp(baseSafety(segment, period) - safetyPenalty));
  const share = clamp01(profile.accessibilityShare - (period === 'noite' ? 0.1 : 0));
  const overallScore = round(share * accessibilityScore + (1 - share) * safetyScore);

  const isCritical = overallScore < 45 || hasCriticalAlert || structural.some((w) => w.critical);

  const durationMin =
    segment.fixedDurationMin ?? segment.distanceM / profile.walkingSpeedMps / 60;

  return {
    segment,
    reversed,
    fromLabel,
    toLabel,
    instruction,
    durationMin,
    accessibilityScore,
    safetyScore,
    overallScore,
    activeAlerts,
    isCritical,
    warnings,
  };
}

/* ----------------------------- Avaliação da rota -------------------------- */

export function routeKey(routeId: string, reversed: boolean): string {
  return `${routeId}:${reversed ? 'volta' : 'ida'}`;
}

export function parseRouteKey(key: string): { route: RouteDef; reversed: boolean } | null {
  const [routeId, direction] = key.split(':');
  const route = ROUTES_BY_ID[routeId];
  if (!route || (direction !== 'ida' && direction !== 'volta')) return null;
  return { route, reversed: direction === 'volta' };
}

function orientedSteps(route: RouteDef, reversed: boolean): RouteStepDef[] {
  if (!reversed) return route.steps;
  return [...route.steps].reverse().map((step) => ({ ...step, reverse: !step.reverse }));
}

/** Peso do trecho na média da rota (metrô conta como ~300 m de caminhada). */
function segmentWeight(segment: Segment): number {
  return segment.kind === 'metro' ? 300 : segment.distanceM;
}

export function evaluateRoute(
  route: RouteDef,
  reversed: boolean,
  alertsBySegment: Map<string, CommunityAlert[]>,
  ctx: ScoringContext,
): RouteEvaluation {
  const segments: SegmentEvaluation[] = [];
  for (const step of orientedSteps(route, reversed)) {
    const segment = SEGMENTS_BY_ID[step.segmentId];
    if (!segment) continue; // dado inconsistente: ignora em vez de quebrar a tela
    segments.push(evaluateSegment(segment, Boolean(step.reverse), alertsBySegment.get(segment.id) ?? [], ctx));
  }

  let totalWeight = 0;
  let accSum = 0;
  let safSum = 0;
  let overallSum = 0;
  let distanceM = 0;
  let durationMin = 0;
  let minAcc = 100;
  let minSaf = 100;
  let minOverall = 100;

  for (const evaluation of segments) {
    const weight = segmentWeight(evaluation.segment);
    totalWeight += weight;
    accSum += evaluation.accessibilityScore * weight;
    safSum += evaluation.safetyScore * weight;
    overallSum += evaluation.overallScore * weight;
    distanceM += evaluation.segment.distanceM;
    durationMin += evaluation.durationMin;
    minAcc = Math.min(minAcc, evaluation.accessibilityScore);
    minSaf = Math.min(minSaf, evaluation.safetyScore);
    minOverall = Math.min(minOverall, evaluation.overallScore);
  }

  const safeWeight = totalWeight || 1;
  // O "gargalo" (pior trecho) pesa na nota: uma rota é tão acessível quanto seu pior ponto.
  const accessibilityScore = round(0.75 * (accSum / safeWeight) + 0.25 * minAcc);
  const safetyScore = round(0.75 * (safSum / safeWeight) + 0.25 * minSaf);
  const overallScore = round(0.7 * (overallSum / safeWeight) + 0.3 * minOverall);

  const originId = reversed ? route.destinationId : route.originId;
  const destinationId = reversed ? route.originId : route.destinationId;

  return {
    key: routeKey(route.id, reversed),
    route,
    reversed,
    originId,
    destinationId,
    distanceM,
    durationMin: Math.ceil(durationMin),
    accessibilityScore,
    safetyScore,
    overallScore,
    level: scoreLevel(overallScore),
    segments,
    criticalCount: segments.filter((s) => s.isCritical).length,
    warnings: segments.flatMap((s) => s.warnings),
  };
}

/* --------------------------- Pares origem/destino ------------------------- */

export function findRoutesForPair(
  originId: string,
  destinationId: string,
): { route: RouteDef; reversed: boolean }[] {
  const result: { route: RouteDef; reversed: boolean }[] = [];
  for (const route of ROUTES) {
    if (route.originId === originId && route.destinationId === destinationId) {
      result.push({ route, reversed: false });
    } else if (route.originId === destinationId && route.destinationId === originId) {
      result.push({ route, reversed: true });
    }
  }
  return result;
}

export function getReachableDestinationIds(originId: string): Set<string> {
  const ids = new Set<string>();
  for (const route of ROUTES) {
    if (route.originId === originId) ids.add(route.destinationId);
    if (route.destinationId === originId) ids.add(route.originId);
  }
  return ids;
}

/* ------------------------------- Comparador ------------------------------- */

function compareEvaluations(a: RouteEvaluation, b: RouteEvaluation): number {
  if (b.overallScore !== a.overallScore) return b.overallScore - a.overallScore;
  if (a.criticalCount !== b.criticalCount) return a.criticalCount - b.criticalCount;
  return a.durationMin - b.durationMin;
}

function buildReasons(best: RouteEvaluation, runnerUp: RouteEvaluation | undefined, profile: MobilityProfile): string[] {
  const reasons: string[] = [
    `Melhor nota geral para o perfil "${profile.label}": ${best.overallScore}/100.`,
  ];
  if (runnerUp) {
    const accDiff = best.accessibilityScore - runnerUp.accessibilityScore;
    const safDiff = best.safetyScore - runnerUp.safetyScore;
    const critDiff = runnerUp.criticalCount - best.criticalCount;
    const timeDiff = runnerUp.durationMin - best.durationMin;

    if (accDiff >= 3) reasons.push(`Acessibilidade ${accDiff} pontos acima da 2ª opção.`);
    if (safDiff >= 3) reasons.push(`Segurança ${safDiff} pontos acima da 2ª opção.`);
    if (critDiff > 0) {
      reasons.push(`${critDiff} trecho${critDiff > 1 ? 's' : ''} crítico${critDiff > 1 ? 's' : ''} a menos.`);
    }
    if (timeDiff > 0) reasons.push(`Chega ${formatDuration(timeDiff)} antes.`);
    if (timeDiff < 0) reasons.push(`Leva ${formatDuration(-timeDiff)} a mais, mas evita barreiras.`);
  }
  if (best.criticalCount > 0) {
    reasons.push(
      `Atenção: mesmo a melhor rota tem ${best.criticalCount} trecho${best.criticalCount > 1 ? 's' : ''} crítico${
        best.criticalCount > 1 ? 's' : ''
      }. Confira os alertas antes de sair.`,
    );
  }
  return reasons;
}

export function compareRoutes(
  originId: string,
  destinationId: string,
  alerts: CommunityAlert[],
  ctx: ScoringContext,
): RouteComparison {
  const candidates = findRoutesForPair(originId, destinationId);
  if (candidates.length === 0) return { evaluations: [], recommended: null, reasons: [] };

  const alertsBySegment = groupActiveAlertsBySegment(alerts);
  const evaluations = candidates
    .map(({ route, reversed }) => evaluateRoute(route, reversed, alertsBySegment, ctx))
    .sort(compareEvaluations);

  const recommended = evaluations[0] ?? null;
  const reasons = recommended ? buildReasons(recommended, evaluations[1], ctx.profile) : [];
  return { evaluations, recommended, reasons };
}

/* --------------------------------- Feed ----------------------------------- */

export function buildAlertFeed(alerts: CommunityAlert[], now: number): AlertFeedItem[] {
  const items: AlertFeedItem[] = alerts.map((alert) => {
    const segment = SEGMENTS_BY_ID[alert.segmentId];
    return {
      alert,
      relevance: alertRelevance(alert, now),
      confidence: alertConfidence(alert),
      segmentLabel: segment ? segmentLabel(segment) : 'Trecho não identificado',
      neighborhood: segment?.neighborhood ?? '—',
    };
  });

  return items.sort((a, b) => {
    if (a.alert.status !== b.alert.status) return a.alert.status === 'ativo' ? -1 : 1;
    if (a.alert.status === 'ativo') return b.relevance - a.relevance;
    return (b.alert.resolvedAt ?? b.alert.updatedAt).localeCompare(a.alert.resolvedAt ?? a.alert.updatedAt);
  });
}

/* ------------------------------ Utilidades -------------------------------- */

export function placeName(placeId: string): string {
  return PLACES_BY_ID[placeId]?.shortName ?? placeId;
}
