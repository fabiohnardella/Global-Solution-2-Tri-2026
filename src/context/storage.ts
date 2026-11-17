import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_DISPLAY, DEFAULT_SETTINGS } from '../data/catalog';
import { SCHEMA_VERSION } from '../data/initialAlerts';
import type {
  AlertVote,
  AppSettings,
  CommunityAlert,
  DisplayPreferences,
  PersistedAppState,
  SupportRequest,
} from '../types';

/* ==========================================================================
 * Camada de persistência local (AsyncStorage) com validação defensiva.
 * Dados corrompidos nunca derrubam o app: são descartados e o seed é usado.
 * ========================================================================== */

export const STORAGE_KEYS = {
  appState: '@rotas-acessiveis/app-state/v1',
  display: '@rotas-acessiveis/display/v1',
} as const;

const SEVERITY_VALUES = ['baixa', 'media', 'alta', 'critica'];
const STATUS_VALUES = ['ativo', 'resolvido'];
const CATEGORY_VALUES = [
  'calcada_quebrada',
  'falta_rampa',
  'piso_tatil_danificado',
  'poste_apagado',
  'alagamento',
  'obra_sem_sinalizacao',
  'elevador_inoperante',
  'obstaculo_calcada',
];
const PROFILE_VALUES = ['cadeirante', 'deficiencia_visual', 'idoso', 'pedestre'];
const PERIOD_VALUES = ['auto', 'dia', 'noite'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidAlert(value: unknown): value is CommunityAlert {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.segmentId) &&
    isString(value.category) &&
    CATEGORY_VALUES.includes(value.category) &&
    isString(value.severity) &&
    SEVERITY_VALUES.includes(value.severity) &&
    isString(value.status) &&
    STATUS_VALUES.includes(value.status) &&
    isString(value.reference) &&
    isString(value.description) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    isString(value.lastConfirmedAt) &&
    isNumber(value.confirmations) &&
    isNumber(value.resolvedVotes) &&
    isString(value.authorId) &&
    isString(value.authorName)
  );
}

function isValidSupportRequest(value: unknown): value is SupportRequest {
  return (
    isRecord(value) &&
    isString(value.id) &&
    (value.kind === 'apoio' || value.kind === 'emergencia') &&
    isString(value.createdAt) &&
    isString(value.routeName) &&
    isString(value.locationLabel)
  );
}

function sanitizeSettings(value: unknown): AppSettings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };
  return {
    profile:
      isString(value.profile) && PROFILE_VALUES.includes(value.profile)
        ? (value.profile as AppSettings['profile'])
        : DEFAULT_SETTINGS.profile,
    voiceEnabled: typeof value.voiceEnabled === 'boolean' ? value.voiceEnabled : DEFAULT_SETTINGS.voiceEnabled,
    speechRate:
      isNumber(value.speechRate) && value.speechRate >= 0.5 && value.speechRate <= 1.5
        ? value.speechRate
        : DEFAULT_SETTINGS.speechRate,
    period:
      isString(value.period) && PERIOD_VALUES.includes(value.period)
        ? (value.period as AppSettings['period'])
        : DEFAULT_SETTINGS.period,
  };
}

function sanitizeVotes(value: unknown): Record<string, AlertVote> {
  if (!isRecord(value)) return {};
  const votes: Record<string, AlertVote> = {};
  for (const [alertId, vote] of Object.entries(value)) {
    if (vote === 'confirmou' || vote === 'resolveu') votes[alertId] = vote;
  }
  return votes;
}

/** Carrega o estado do app. Retorna null se não houver dados (primeiro uso) ou se estiverem inválidos. */
export async function loadAppState(): Promise<PersistedAppState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.appState);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.alerts)) {
      return null;
    }
    const session =
      isRecord(parsed.session) &&
      isString(parsed.session.citizenId) &&
      isString(parsed.session.displayName) &&
      isString(parsed.session.startedAt)
        ? {
            citizenId: parsed.session.citizenId,
            displayName: parsed.session.displayName,
            startedAt: parsed.session.startedAt,
          }
        : null;

    return {
      schemaVersion: SCHEMA_VERSION,
      session,
      settings: sanitizeSettings(parsed.settings),
      alerts: parsed.alerts.filter(isValidAlert),
      votes: sanitizeVotes(parsed.votes),
      supportRequests: Array.isArray(parsed.supportRequests)
        ? parsed.supportRequests.filter(isValidSupportRequest)
        : [],
    };
  } catch (error) {
    console.warn('[storage] Falha ao carregar estado; usando dados iniciais.', error);
    return null;
  }
}

export async function saveAppState(state: PersistedAppState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.appState, JSON.stringify(state));
}

export async function loadDisplayPreferences(): Promise<DisplayPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.display);
    if (!raw) return { ...DEFAULT_DISPLAY };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { ...DEFAULT_DISPLAY };
    return {
      highContrast: typeof parsed.highContrast === 'boolean' ? parsed.highContrast : DEFAULT_DISPLAY.highContrast,
      largeText: typeof parsed.largeText === 'boolean' ? parsed.largeText : DEFAULT_DISPLAY.largeText,
    };
  } catch (error) {
    console.warn('[storage] Falha ao carregar preferências de exibição.', error);
    return { ...DEFAULT_DISPLAY };
  }
}

export async function saveDisplayPreferences(prefs: DisplayPreferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.display, JSON.stringify(prefs));
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEYS.appState, STORAGE_KEYS.display]);
}
