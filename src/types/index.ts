import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/* ==========================================================================
 * Tipos de domínio — Rotas Acessíveis SP
 * ========================================================================== */

export type ISODateString = string;

/** Nome de ícone válido do Ionicons (checado pelo TypeScript). */
export type IoniconName = ComponentProps<typeof Ionicons>['name'];

/* ----------------------------- Catálogos ---------------------------------- */

export type MobilityProfileId = 'cadeirante' | 'deficiencia_visual' | 'idoso' | 'pedestre';

export type DayPeriod = 'dia' | 'noite';
export type PeriodSetting = DayPeriod | 'auto';

export type BarrierCategory =
  | 'calcada_quebrada'
  | 'falta_rampa'
  | 'piso_tatil_danificado'
  | 'poste_apagado'
  | 'alagamento'
  | 'obra_sem_sinalizacao'
  | 'elevador_inoperante'
  | 'obstaculo_calcada';

export type Severity = 'baixa' | 'media' | 'alta' | 'critica';

export type AlertStatus = 'ativo' | 'resolvido';

/** Voto que o cidadão deste aparelho já deu em um alerta (1 voto por alerta). */
export type AlertVote = 'confirmou' | 'resolveu';

export type SegmentKind = 'calcada' | 'calcadao' | 'travessia' | 'metro';

export type ScoreLevel = 'otimo' | 'bom' | 'regular' | 'critico';

export interface CategoryMeta {
  id: BarrierCategory;
  label: string;
  /** Versão curta usada na fala ("rampa interditada", "poste apagado"...). */
  spokenLabel: string;
  icon: IoniconName;
  description: string;
  /** Quanto a barreira afeta cada índice (0–1). */
  impact: { accessibility: number; safety: number };
}

export interface SeverityMeta {
  id: Severity;
  label: string;
  description: string;
  icon: IoniconName;
  /** Peso-base da relevância do alerta (0–100). */
  relevanceWeight: number;
  /** Pontos máximos descontados do score do trecho. */
  penalty: number;
  order: number;
}

export interface AccessibilityWeights {
  ramp: number;
  tactile: number;
  width: number;
  slope: number;
}

export interface MobilityProfile {
  id: MobilityProfileId;
  label: string;
  description: string;
  icon: IoniconName;
  /** Velocidade média de deslocamento em metros por segundo. */
  walkingSpeedMps: number;
  accessibilityWeights: AccessibilityWeights;
  /** Peso da acessibilidade na nota geral (o restante é segurança). */
  accessibilityShare: number;
  /** Multiplicador de penalidade por categoria (padrão 1). */
  categorySensitivity: Partial<Record<BarrierCategory, number>>;
  /** Inclinação (%) a partir da qual o trecho fica desconfortável. */
  maxComfortSlope: number;
  /** Largura mínima confortável da faixa livre (m). */
  minComfortWidth: number;
}

/* ------------------------------ Geografia --------------------------------- */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Place {
  id: string;
  name: string;
  shortName: string;
  address: string;
  neighborhood: string;
  coordinate: GeoPoint;
  /** Referência de chegada lida no fim da navegação. */
  arrivalTip: string;
}

export interface AccessibilityMetrics {
  /** Proporção de esquinas/travessias com rampa adequada (0–1). */
  rampCoverage: number;
  /** Proporção do trecho com piso tátil contínuo (0–1). */
  tactileCoverage: number;
  /** Largura média da faixa livre da calçada (m). */
  sidewalkWidthM: number;
  /** Inclinação longitudinal média (%). */
  slopePercent: number;
}

export interface SafetyMetrics {
  /** Qualidade da iluminação pública (0–1). */
  lighting: number;
  /** Movimento de pedestres / "olhos da rua" (0–1). */
  pedestrianFlow: number;
  /** Ocorrências registradas nos últimos 90 dias no trecho. */
  incidents90d: number;
}

export interface Segment {
  id: string;
  street: string;
  /** Artigo usado na instrução: "pela Rua..." / "pelo Viaduto...". */
  streetArticle: 'a' | 'o';
  kind: SegmentKind;
  startLabel: string;
  endLabel: string;
  neighborhood: string;
  distanceM: number;
  /** Para trechos de metrô: tempo fixo (espera + viagem), em minutos. */
  fixedDurationMin?: number;
  accessibility: AccessibilityMetrics;
  safety: SafetyMetrics;
  /** Dica física de orientação lida no modo navegação. */
  guidance: string;
}

export interface RouteStepDef {
  segmentId: string;
  /** Percorre o trecho no sentido fim → início. */
  reverse?: boolean;
}

export interface RouteDef {
  id: string;
  name: string;
  summary: string;
  originId: string;
  destinationId: string;
  steps: RouteStepDef[];
}

/* --------------------------- Dados da comunidade -------------------------- */

export interface CommunityAlert {
  id: string;
  segmentId: string;
  category: BarrierCategory;
  severity: Severity;
  /** Endereço/ponto de referência informado pelo cidadão. */
  reference: string;
  description: string;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  lastConfirmedAt: ISODateString;
  confirmations: number;
  resolvedVotes: number;
  status: AlertStatus;
  resolvedAt?: ISODateString;
  authorId: string;
  authorName: string;
}

export interface NewReportInput {
  segmentId: string;
  category: BarrierCategory;
  severity: Severity;
  reference: string;
  description: string;
}

export type SupportRequestKind = 'apoio' | 'emergencia';

export interface SupportRequest {
  id: string;
  kind: SupportRequestKind;
  createdAt: ISODateString;
  routeName: string;
  /** Trecho em que a pessoa estava quando pediu ajuda. */
  locationLabel: string;
}

export interface CitizenSession {
  citizenId: string;
  displayName: string;
  startedAt: ISODateString;
}

export interface AppSettings {
  profile: MobilityProfileId;
  voiceEnabled: boolean;
  /** Velocidade da fala (expo-speech): 0.5 a 1.5. */
  speechRate: number;
  period: PeriodSetting;
}

export interface DisplayPreferences {
  highContrast: boolean;
  largeText: boolean;
}

export interface PersistedAppState {
  schemaVersion: number;
  session: CitizenSession | null;
  settings: AppSettings;
  alerts: CommunityAlert[];
  /** alertId → voto deste aparelho. */
  votes: Record<string, AlertVote>;
  supportRequests: SupportRequest[];
}

/* ----------------------- Resultados de avaliação -------------------------- */

export interface AlertInsight {
  alert: CommunityAlert;
  /** Relevância 0–100 (gravidade × confiança × atualidade). */
  relevance: number;
  /** Confiança 0–1 com base em confirmações x votos de resolvido. */
  confidence: number;
}

export interface RouteWarning {
  id: string;
  segmentId: string;
  message: string;
  severity: Severity | 'estrutural';
}

export interface SegmentEvaluation {
  segment: Segment;
  reversed: boolean;
  fromLabel: string;
  toLabel: string;
  instruction: string;
  durationMin: number;
  accessibilityScore: number;
  safetyScore: number;
  overallScore: number;
  activeAlerts: AlertInsight[];
  isCritical: boolean;
  warnings: RouteWarning[];
}

export interface RouteEvaluation {
  /** Chave única: id da rota + sentido (ex.: "r01:ida"). */
  key: string;
  route: RouteDef;
  reversed: boolean;
  originId: string;
  destinationId: string;
  distanceM: number;
  durationMin: number;
  accessibilityScore: number;
  safetyScore: number;
  overallScore: number;
  level: ScoreLevel;
  segments: SegmentEvaluation[];
  criticalCount: number;
  warnings: RouteWarning[];
}

export interface RouteComparison {
  evaluations: RouteEvaluation[];
  recommended: RouteEvaluation | null;
  reasons: string[];
}

export interface AlertFeedItem {
  alert: CommunityAlert;
  relevance: number;
  confidence: number;
  segmentLabel: string;
  neighborhood: string;
}
