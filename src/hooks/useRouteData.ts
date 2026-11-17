import { useMemo } from 'react';
import { PROFILES } from '../data/catalog';
import { useAppState } from '../context/AppDataContext';
import type { AlertFeedItem, RouteComparison, RouteEvaluation } from '../types';
import {
  buildAlertFeed,
  compareRoutes,
  evaluateRoute,
  groupActiveAlertsBySegment,
  parseRouteKey,
  resolvePeriod,
  type ScoringContext,
} from '../utils/scoring';

/* ==========================================================================
 * Hooks derivados: todo cálculo pesado é memoizado e só refeito quando os
 * alertas, o perfil ou o período mudam — nunca a cada render.
 * ========================================================================== */

/** Contexto de pontuação (perfil + período + "agora"), recalculado só quando necessário. */
export function useScoringContext(): ScoringContext {
  const { settings, alerts } = useAppState();
  // [MEMORY MANAGEMENT] "now" é amarrado à versão dos alertas para manter a
  // referência estável entre renders e permitir memoização em cascata.
  return useMemo<ScoringContext>(
    () => ({
      profile: PROFILES[settings.profile],
      period: resolvePeriod(settings.period),
      now: Date.now(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.profile, settings.period, alerts],
  );
}

export function useRouteComparison(originId: string | null, destinationId: string | null): RouteComparison {
  const { alerts } = useAppState();
  const ctx = useScoringContext();

  // [MEMORY MANAGEMENT] Comparação memoizada: score das rotas é recalculado em tempo
  // real quando um novo reporte/validação altera "alerts", e só nesse caso.
  return useMemo<RouteComparison>(() => {
    if (!originId || !destinationId || originId === destinationId) {
      return { evaluations: [], recommended: null, reasons: [] };
    }
    return compareRoutes(originId, destinationId, alerts, ctx);
  }, [originId, destinationId, alerts, ctx]);
}

/** Avaliação de uma rota específica pela chave "rXX:ida|volta" (modo navegação). */
export function useRouteEvaluation(routeKeyValue: string): RouteEvaluation | null {
  const { alerts } = useAppState();
  const ctx = useScoringContext();

  return useMemo(() => {
    const parsed = parseRouteKey(routeKeyValue);
    if (!parsed) return null;
    return evaluateRoute(parsed.route, parsed.reversed, groupActiveAlertsBySegment(alerts), ctx);
  }, [routeKeyValue, alerts, ctx]);
}

/** Feed completo ordenado por relevância (filtragem é feita na tela, também memoizada). */
export function useAlertFeed(): AlertFeedItem[] {
  const { alerts } = useAppState();
  return useMemo(() => buildAlertFeed(alerts, Date.now()), [alerts]);
}
