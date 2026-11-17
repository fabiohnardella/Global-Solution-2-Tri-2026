import type {
  AppSettings,
  BarrierCategory,
  CategoryMeta,
  DisplayPreferences,
  MobilityProfile,
  MobilityProfileId,
  Severity,
  SeverityMeta,
} from '../types';

/* ==========================================================================
 * Catálogos estáticos: categorias de barreira, gravidade e perfis de mobilidade
 * ========================================================================== */

export const CATEGORIES: Record<BarrierCategory, CategoryMeta> = {
  calcada_quebrada: {
    id: 'calcada_quebrada',
    label: 'Calçada quebrada',
    spokenLabel: 'calçada quebrada',
    icon: 'warning',
    description: 'Buracos, desníveis, pedras soltas ou piso afundado.',
    impact: { accessibility: 1, safety: 0.3 },
  },
  falta_rampa: {
    id: 'falta_rampa',
    label: 'Falta de rampa',
    spokenLabel: 'rampa ausente ou interditada',
    icon: 'accessibility',
    description: 'Esquina ou travessia sem rampa, ou rampa bloqueada.',
    impact: { accessibility: 1, safety: 0 },
  },
  piso_tatil_danificado: {
    id: 'piso_tatil_danificado',
    label: 'Piso tátil danificado',
    spokenLabel: 'piso tátil interrompido',
    icon: 'grid',
    description: 'Piso tátil ausente, descolado ou levando a obstáculo.',
    impact: { accessibility: 1, safety: 0 },
  },
  poste_apagado: {
    id: 'poste_apagado',
    label: 'Poste apagado',
    spokenLabel: 'trecho com poste apagado',
    icon: 'flash-off',
    description: 'Iluminação pública apagada ou muito fraca.',
    impact: { accessibility: 0.1, safety: 1 },
  },
  alagamento: {
    id: 'alagamento',
    label: 'Alagamento',
    spokenLabel: 'alagamento',
    icon: 'water',
    description: 'Água acumulada que impede ou arrisca a passagem.',
    impact: { accessibility: 0.8, safety: 0.6 },
  },
  obra_sem_sinalizacao: {
    id: 'obra_sem_sinalizacao',
    label: 'Obra sem sinalização',
    spokenLabel: 'obra sem sinalização',
    icon: 'construct',
    description: 'Obra sem tapume, sem rota alternativa ou sem aviso.',
    impact: { accessibility: 0.8, safety: 0.7 },
  },
  elevador_inoperante: {
    id: 'elevador_inoperante',
    label: 'Elevador parado',
    spokenLabel: 'elevador fora de operação',
    icon: 'swap-vertical',
    description: 'Elevador ou plataforma de estação/passarela fora de uso.',
    impact: { accessibility: 1, safety: 0 },
  },
  obstaculo_calcada: {
    id: 'obstaculo_calcada',
    label: 'Obstáculo na calçada',
    spokenLabel: 'obstáculo na calçada',
    icon: 'cube',
    description: 'Carro, mesas, entulho, raiz de árvore ou lixo bloqueando.',
    impact: { accessibility: 0.9, safety: 0.2 },
  },
};

export const CATEGORY_LIST: CategoryMeta[] = Object.values(CATEGORIES);

export const SEVERITIES: Record<Severity, SeverityMeta> = {
  baixa: {
    id: 'baixa',
    label: 'Baixa',
    description: 'Incomoda, mas dá para passar com atenção.',
    icon: 'information-circle',
    relevanceWeight: 25,
    penalty: 6,
    order: 1,
  },
  media: {
    id: 'media',
    label: 'Média',
    description: 'Exige desvio ou muito cuidado.',
    icon: 'alert-circle',
    relevanceWeight: 50,
    penalty: 14,
    order: 2,
  },
  alta: {
    id: 'alta',
    label: 'Alta',
    description: 'Impede a passagem de cadeira de rodas, andador ou bengala.',
    icon: 'warning',
    relevanceWeight: 75,
    penalty: 25,
    order: 3,
  },
  critica: {
    id: 'critica',
    label: 'Crítica',
    description: 'Risco imediato à integridade de quem passa.',
    icon: 'flame',
    relevanceWeight: 100,
    penalty: 40,
    order: 4,
  },
};

export const SEVERITY_LIST: SeverityMeta[] = Object.values(SEVERITIES).sort(
  (a, b) => a.order - b.order,
);

export const PROFILES: Record<MobilityProfileId, MobilityProfile> = {
  cadeirante: {
    id: 'cadeirante',
    label: 'Cadeirante / mobilidade reduzida',
    description: 'Prioriza rampas, calçadas largas e pouca inclinação.',
    icon: 'accessibility',
    walkingSpeedMps: 0.9,
    accessibilityWeights: { ramp: 0.35, tactile: 0.05, width: 0.3, slope: 0.3 },
    accessibilityShare: 0.65,
    categorySensitivity: {
      falta_rampa: 1.6,
      elevador_inoperante: 1.7,
      calcada_quebrada: 1.3,
      obstaculo_calcada: 1.3,
      piso_tatil_danificado: 0.3,
      poste_apagado: 0.8,
    },
    maxComfortSlope: 8.33, // NBR 9050: inclinação máxima de rampa
    minComfortWidth: 1.2, // NBR 9050: faixa livre mínima
  },
  deficiencia_visual: {
    id: 'deficiencia_visual',
    label: 'Pessoa com deficiência visual',
    description: 'Prioriza piso tátil contínuo e trechos sem obstáculos.',
    icon: 'eye-off',
    walkingSpeedMps: 0.85,
    accessibilityWeights: { ramp: 0.1, tactile: 0.5, width: 0.25, slope: 0.15 },
    accessibilityShare: 0.6,
    categorySensitivity: {
      piso_tatil_danificado: 1.8,
      obstaculo_calcada: 1.6,
      obra_sem_sinalizacao: 1.6,
      calcada_quebrada: 1.2,
      falta_rampa: 0.6,
    },
    maxComfortSlope: 12,
    minComfortWidth: 1.2,
  },
  idoso: {
    id: 'idoso',
    label: 'Pessoa idosa',
    description: 'Prioriza piso regular, pouca ladeira e boa iluminação.',
    icon: 'walk',
    walkingSpeedMps: 0.9,
    accessibilityWeights: { ramp: 0.25, tactile: 0.1, width: 0.25, slope: 0.4 },
    accessibilityShare: 0.5,
    categorySensitivity: {
      calcada_quebrada: 1.5,
      alagamento: 1.4,
      poste_apagado: 1.3,
      obstaculo_calcada: 1.2,
      elevador_inoperante: 1.3,
    },
    maxComfortSlope: 8.33,
    minComfortWidth: 1.2,
  },
  pedestre: {
    id: 'pedestre',
    label: 'Pedestre',
    description: 'Equilíbrio entre segurança, tempo e conforto.',
    icon: 'footsteps',
    walkingSpeedMps: 1.3,
    accessibilityWeights: { ramp: 0.25, tactile: 0.25, width: 0.25, slope: 0.25 },
    accessibilityShare: 0.4,
    categorySensitivity: {},
    maxComfortSlope: 15,
    minComfortWidth: 0.9,
  },
};

export const PROFILE_LIST: MobilityProfile[] = Object.values(PROFILES);

export const DEFAULT_SETTINGS: AppSettings = {
  profile: 'cadeirante',
  voiceEnabled: true,
  speechRate: 0.95,
  period: 'auto',
};

export const DEFAULT_DISPLAY: DisplayPreferences = {
  highContrast: false,
  largeText: false,
};

/** Votos de "resolvido" necessários (e maiores que as confirmações) para encerrar um alerta. */
export const RESOLVE_MIN_VOTES = 3;

/** Contatos de emergência usados no modo navegação. */
export const EMERGENCY_NUMBERS = {
  samu: '192',
  policiaMilitar: '190',
  bombeiros: '193',
  defesaCivil: '199',
} as const;
