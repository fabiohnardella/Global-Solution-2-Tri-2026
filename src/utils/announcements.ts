import { CATEGORIES } from '../data/catalog';
import { PLACES_BY_ID } from '../data/places';
import type { AlertInsight, RouteEvaluation, SegmentEvaluation } from '../types';
import { formatSpokenDistance } from './format';

/* ==========================================================================
 * Textos falados pelo modo Navegação Assistida (expo-speech, pt-BR)
 * ========================================================================== */

export function buildHazardAnnouncement(insight: AlertInsight, metersAhead: number): string {
  const category = CATEGORIES[insight.alert.category];
  const prefix = insight.alert.severity === 'critica' ? 'Perigo' : 'Atenção';
  const where = metersAhead <= 15 ? 'logo à frente' : `a ${formatSpokenDistance(metersAhead)}`;
  return `${prefix}: ${category.spokenLabel} ${where}. ${insight.alert.reference}.`;
}

export function buildStepAnnouncement(step: SegmentEvaluation, index: number, total: number): string {
  const parts = [
    `Passo ${index + 1} de ${total}.`,
    step.instruction,
    step.segment.kind === 'metro' ? '' : `Cerca de ${formatSpokenDistance(step.segment.distanceM)}.`,
    step.segment.guidance,
  ];
  if (step.activeAlerts.length > 0) {
    parts.push(
      step.activeAlerts.length === 1
        ? 'Há 1 alerta da comunidade neste trecho.'
        : `Há ${step.activeAlerts.length} alertas da comunidade neste trecho.`,
    );
  }
  return parts.filter(Boolean).join(' ');
}

export function buildRouteIntro(evaluation: RouteEvaluation): string {
  const origin = PLACES_BY_ID[evaluation.originId]?.shortName ?? 'origem';
  const destination = PLACES_BY_ID[evaluation.destinationId]?.shortName ?? 'destino';
  const critical =
    evaluation.criticalCount === 0
      ? 'Nenhum trecho crítico no caminho.'
      : `Atenção: ${evaluation.criticalCount} trecho${evaluation.criticalCount > 1 ? 's' : ''} crítico${
          evaluation.criticalCount > 1 ? 's' : ''
        } no caminho.`;
  return `Navegação iniciada de ${origin} até ${destination}, ${evaluation.route.name}. Tempo estimado: ${evaluation.durationMin} minutos. ${critical}`;
}

export function buildArrivalAnnouncement(evaluation: RouteEvaluation): string {
  const destination = PLACES_BY_ID[evaluation.destinationId];
  if (!destination) return 'Você chegou ao destino.';
  return `Você chegou: ${destination.shortName}. ${destination.arrivalTip}`;
}
