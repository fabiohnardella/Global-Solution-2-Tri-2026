import type { RouteDef } from '../types';

/* ==========================================================================
 * Rotas alternativas por par de origem/destino.
 * Cada rota vale nos dois sentidos (o sentido inverso é gerado na avaliação).
 * ========================================================================== */

export const ROUTES: RouteDef[] = [
  /* -------------- Est. Consolação → Hospital das Clínicas -------------- */
  {
    id: 'r01',
    name: 'Pela Av. Dr. Arnaldo',
    summary: 'Caminho mais direto, com trecho em declive e calçada estreita.',
    originId: 'consolacao',
    destinationId: 'hc',
    steps: [{ segmentId: 's01' }, { segmentId: 's02' }, { segmentId: 's03' }],
  },
  {
    id: 'r02',
    name: 'Pela Rua Oscar Freire',
    summary: 'Mais longa, mas com calçadas requalificadas e piso tátil.',
    originId: 'consolacao',
    destinationId: 'hc',
    steps: [{ segmentId: 's04' }, { segmentId: 's05' }, { segmentId: 's06' }, { segmentId: 's03' }],
  },
  {
    id: 'r03',
    name: 'Metrô Linha 2 até Clínicas',
    summary: 'Uma estação de metrô com elevadores e caminhada curta.',
    originId: 'consolacao',
    destinationId: 'hc',
    steps: [{ segmentId: 's07' }, { segmentId: 's08' }],
  },

  /* ------------------------------ MASP → CCSP ------------------------------ */
  {
    id: 'r04',
    name: 'Pela Av. Paulista',
    summary: 'Calçadas largas e muito movimento até a Praça Oswaldo Cruz.',
    originId: 'masp',
    destinationId: 'ccsp',
    steps: [{ segmentId: 's09' }, { segmentId: 's10' }, { segmentId: 's11' }, { segmentId: 's12' }],
  },
  {
    id: 'r05',
    name: 'Pela Alameda Santos',
    summary: 'Rua paralela mais calma, com ladeira curta no final.',
    originId: 'masp',
    destinationId: 'ccsp',
    steps: [
      { segmentId: 's09' },
      { segmentId: 's13' },
      { segmentId: 's14' },
      { segmentId: 's15' },
      { segmentId: 's12' },
    ],
  },
  {
    id: 'r06',
    name: 'Metrô Trianon-MASP → Paraíso',
    summary: 'Três estações de metrô e caminhada curta pela Vergueiro.',
    originId: 'masp',
    destinationId: 'ccsp',
    steps: [{ segmentId: 's17' }, { segmentId: 's16' }, { segmentId: 's18' }],
  },

  /* ---------------------- Theatro Municipal → Catedral da Sé --------------- */
  {
    id: 'r07',
    name: 'Viaduto do Chá e Rua Direita',
    summary: 'Caminho clássico pelos calçadões, com muito movimento.',
    originId: 'theatro',
    destinationId: 'se',
    steps: [{ segmentId: 's19' }, { segmentId: 's20' }],
  },
  {
    id: 'r08',
    name: 'Vale do Anhangabaú e Rua XV',
    summary: 'Piso reformado no Vale; menos movimento à noite.',
    originId: 'theatro',
    destinationId: 'se',
    steps: [{ segmentId: 's21' }, { segmentId: 's22' }, { segmentId: 's23' }],
  },
  {
    id: 'r09',
    name: 'Metrô Linha 3: Anhangabaú → Sé',
    summary: 'Uma estação de metrô; saída pela Praça da Sé.',
    originId: 'theatro',
    destinationId: 'se',
    steps: [{ segmentId: 's24' }, { segmentId: 's25' }, { segmentId: 's26' }],
  },
];

export const ROUTES_BY_ID: Record<string, RouteDef> = ROUTES.reduce<Record<string, RouteDef>>(
  (acc, route) => {
    acc[route.id] = route;
    return acc;
  },
  {},
);
