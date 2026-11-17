import type { CommunityAlert, PersistedAppState } from '../types';
import { DEFAULT_SETTINGS } from './catalog';

/* ==========================================================================
 * Alertas iniciais da comunidade (seed). As datas são relativas ao momento
 * do primeiro uso, para o app sempre abrir com dados "frescos".
 * ========================================================================== */

export const SCHEMA_VERSION = 1;

const HOUR_MS = 60 * 60 * 1000;

interface SeedAlert extends Omit<CommunityAlert, 'createdAt' | 'updatedAt' | 'lastConfirmedAt' | 'resolvedAt'> {
  createdHoursAgo: number;
  lastConfirmedHoursAgo: number;
  resolvedHoursAgo?: number;
}

const SEED_ALERTS: SeedAlert[] = [
  {
    id: 'seed-a01',
    segmentId: 's02',
    category: 'falta_rampa',
    severity: 'alta',
    reference: 'Esquina com a Rua Cardeal Arcoverde',
    description: 'Rampa interditada por obra da concessionária. Cadeirantes precisam descer pela rua.',
    confirmations: 7,
    resolvedVotes: 0,
    status: 'ativo',
    authorId: 'seed-ana',
    authorName: 'Ana P.',
    createdHoursAgo: 52,
    lastConfirmedHoursAgo: 3,
  },
  {
    id: 'seed-a02',
    segmentId: 's10',
    category: 'piso_tatil_danificado',
    severity: 'media',
    reference: 'Saída da Estação Brigadeiro, lado ímpar',
    description: 'Piso tátil descolado por cerca de 10 metros; a linha guia some perto da banca.',
    confirmations: 4,
    resolvedVotes: 1,
    status: 'ativo',
    authorId: 'seed-joao',
    authorName: 'João R.',
    createdHoursAgo: 120,
    lastConfirmedHoursAgo: 30,
  },
  {
    id: 'seed-a03',
    segmentId: 's19',
    category: 'poste_apagado',
    severity: 'alta',
    reference: 'Meio do viaduto, sentido Patriarca',
    description: 'Três postes seguidos apagados. Trecho fica escuro depois das 18h.',
    confirmations: 9,
    resolvedVotes: 0,
    status: 'ativo',
    authorId: 'seed-coletivo',
    authorName: 'Coletivo Calçada Viva',
    createdHoursAgo: 26,
    lastConfirmedHoursAgo: 5,
  },
  {
    id: 'seed-a04',
    segmentId: 's20',
    category: 'calcada_quebrada',
    severity: 'alta',
    reference: 'Em frente ao nº 180',
    description: 'Pedras portuguesas soltas formando um buraco de uns 40 cm.',
    confirmations: 12,
    resolvedVotes: 0,
    status: 'ativo',
    authorId: 'seed-lourdes',
    authorName: 'Dona Lourdes',
    createdHoursAgo: 75,
    lastConfirmedHoursAgo: 2,
  },
  {
    id: 'seed-a05',
    segmentId: 's06',
    category: 'alagamento',
    severity: 'critica',
    reference: 'Próximo ao cruzamento com a Rua Oscar Freire',
    description: 'Alagamento recorrente após chuva forte; a água cobre a calçada inteira.',
    confirmations: 5,
    resolvedVotes: 1,
    status: 'ativo',
    authorId: 'seed-marcos',
    authorName: 'Marcos T.',
    createdHoursAgo: 6,
    lastConfirmedHoursAgo: 1,
  },
  {
    id: 'seed-a06',
    segmentId: 's14',
    category: 'obstaculo_calcada',
    severity: 'media',
    reference: 'Entre a Rua Pamplona e a Rua Carlos Sampaio',
    description: 'Raiz de árvore levantou a calçada; sobra menos de 80 cm de passagem.',
    confirmations: 3,
    resolvedVotes: 0,
    status: 'ativo',
    authorId: 'seed-bia',
    authorName: 'Beatriz L.',
    createdHoursAgo: 240,
    lastConfirmedHoursAgo: 60,
  },
  {
    id: 'seed-a07',
    segmentId: 's12',
    category: 'obra_sem_sinalizacao',
    severity: 'alta',
    reference: 'Perto do nº 700',
    description: 'Vala aberta sem tapume nem sinalização tátil; passagem pela rua.',
    confirmations: 6,
    resolvedVotes: 0,
    status: 'ativo',
    authorId: 'seed-rafa',
    authorName: 'Rafael S.',
    createdHoursAgo: 22,
    lastConfirmedHoursAgo: 4,
  },
  {
    id: 'seed-a08',
    segmentId: 's25',
    category: 'elevador_inoperante',
    severity: 'critica',
    reference: 'Estação Sé – elevador da saída Praça da Sé',
    description: 'Elevador fora de operação. Use o acesso da Rua Roberto Simonsen ou peça apoio.',
    confirmations: 4,
    resolvedVotes: 0,
    status: 'ativo',
    authorId: 'seed-carla',
    authorName: 'Carla M.',
    createdHoursAgo: 4,
    lastConfirmedHoursAgo: 1,
  },
  {
    id: 'seed-a09',
    segmentId: 's21',
    category: 'poste_apagado',
    severity: 'media',
    reference: 'Perto da escadaria do Largo São Bento',
    description: 'Iluminação fraca perto da escadaria.',
    confirmations: 2,
    resolvedVotes: 2,
    status: 'ativo',
    authorId: 'seed-pedro',
    authorName: 'Pedro H.',
    createdHoursAgo: 480,
    lastConfirmedHoursAgo: 300,
  },
  {
    id: 'seed-a10',
    segmentId: 's23',
    category: 'calcada_quebrada',
    severity: 'baixa',
    reference: 'Em frente à agência bancária da esquina',
    description: 'Tampa de bueiro desnivelada uns 3 cm.',
    confirmations: 1,
    resolvedVotes: 0,
    status: 'ativo',
    authorId: 'seed-gui',
    authorName: 'Guilherme A.',
    createdHoursAgo: 190,
    lastConfirmedHoursAgo: 190,
  },
  {
    id: 'seed-a11',
    segmentId: 's04',
    category: 'obstaculo_calcada',
    severity: 'baixa',
    reference: 'Quarteirão entre a Al. Santos e a Al. Jaú',
    description: 'Mesas de bar ocupando metade da calçada à noite.',
    confirmations: 3,
    resolvedVotes: 0,
    status: 'ativo',
    authorId: 'seed-lu',
    authorName: 'Luana F.',
    createdHoursAgo: 48,
    lastConfirmedHoursAgo: 20,
  },
  {
    id: 'seed-a12',
    segmentId: 's15',
    category: 'falta_rampa',
    severity: 'media',
    reference: 'Esquina com a Praça Oswaldo Cruz',
    description: 'Esquina sem rebaixamento de guia.',
    confirmations: 2,
    resolvedVotes: 0,
    status: 'ativo',
    authorId: 'seed-ana',
    authorName: 'Ana P.',
    createdHoursAgo: 360,
    lastConfirmedHoursAgo: 150,
  },
  {
    id: 'seed-a13',
    segmentId: 's01',
    category: 'piso_tatil_danificado',
    severity: 'media',
    reference: 'Frente ao Conjunto Nacional',
    description: 'Piso tátil reposto pela subprefeitura.',
    confirmations: 3,
    resolvedVotes: 5,
    status: 'resolvido',
    authorId: 'seed-joao',
    authorName: 'João R.',
    createdHoursAgo: 720,
    lastConfirmedHoursAgo: 600,
    resolvedHoursAgo: 96,
  },
];

function hoursAgoIso(now: number, hours: number): string {
  return new Date(now - hours * HOUR_MS).toISOString();
}

export function createInitialAlerts(now: number = Date.now()): CommunityAlert[] {
  return SEED_ALERTS.map(
    ({ createdHoursAgo, lastConfirmedHoursAgo, resolvedHoursAgo, ...rest }): CommunityAlert => {
      const lastTouch = Math.min(lastConfirmedHoursAgo, resolvedHoursAgo ?? Number.POSITIVE_INFINITY);
      return {
        ...rest,
        createdAt: hoursAgoIso(now, createdHoursAgo),
        lastConfirmedAt: hoursAgoIso(now, lastConfirmedHoursAgo),
        updatedAt: hoursAgoIso(now, lastTouch),
        resolvedAt: resolvedHoursAgo !== undefined ? hoursAgoIso(now, resolvedHoursAgo) : undefined,
      };
    },
  );
}

/** Estado inicial completo usado no primeiro uso ou ao "restaurar dados de demonstração". */
export function createSeedState(now: number = Date.now()): PersistedAppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    session: null,
    settings: { ...DEFAULT_SETTINGS },
    alerts: createInitialAlerts(now),
    votes: {},
    supportRequests: [],
  };
}
