import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SEVERITIES } from '../data/catalog';
import { createSeedState } from '../data/initialAlerts';
import type {
  AppSettings,
  CitizenSession,
  CommunityAlert,
  NewReportInput,
  PersistedAppState,
  SupportRequest,
} from '../types';
import { createId } from '../utils/id';
import { shouldAutoResolve } from '../utils/scoring';
import { loadAppState, saveAppState } from './storage';

/* ==========================================================================
 * Contexto de dados do app (sessão, preferências, alertas, votos e pedidos de
 * apoio) com persistência offline em AsyncStorage.
 *
 * Estado e ações ficam em DOIS contextos: componentes que só disparam ações
 * (ex.: botões) não re-renderizam quando a lista de alertas muda.
 * ========================================================================== */

export interface AppDataState extends PersistedAppState {
  hydrated: boolean;
}

export type VoteResult = 'registrado' | 'encerrado' | 'ja_votou' | 'indisponivel';

export interface ReportResult {
  alert: CommunityAlert;
  /** true quando já existia alerta ativo igual no trecho e o reporte virou confirmação. */
  merged: boolean;
}

export interface AppActions {
  startSession: (displayName: string) => void;
  endSession: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  reportBarrier: (input: NewReportInput) => ReportResult;
  confirmAlert: (alertId: string) => VoteResult;
  markAlertResolved: (alertId: string) => VoteResult;
  registerSupportRequest: (input: Omit<SupportRequest, 'id' | 'createdAt'>) => SupportRequest;
  resetDemoData: () => void;
}

type Action =
  | { type: 'HYDRATE'; payload: PersistedAppState }
  | { type: 'START_SESSION'; session: CitizenSession }
  | { type: 'END_SESSION' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'ADD_ALERT'; alert: CommunityAlert }
  | { type: 'CONFIRM_ALERT'; alertId: string; now: string; severityUpgrade?: CommunityAlert['severity'] }
  | { type: 'RESOLVE_ALERT'; alertId: string; citizenId: string; now: string }
  | { type: 'ADD_SUPPORT_REQUEST'; request: SupportRequest }
  | { type: 'RESET_COMMUNITY_DATA'; payload: PersistedAppState };

const initialState: AppDataState = { ...createSeedState(), hydrated: false };

/** Limite de pedidos de apoio guardados (evita crescimento infinito do storage). */
const MAX_SUPPORT_REQUESTS = 50;

/* ------------------------------ Regras de voto ---------------------------- */

function canResolve(state: AppDataState, alert: CommunityAlert, citizenId: string): boolean {
  if (alert.status !== 'ativo') return false;
  const vote = state.votes[alert.id];
  if (vote === undefined) return true;
  // O autor (que já "confirmou" ao reportar) pode encerrar o próprio alerta.
  return vote === 'confirmou' && alert.authorId === citizenId;
}

function applyResolveVote(alert: CommunityAlert, citizenId: string, now: string): CommunityAlert {
  const updated: CommunityAlert = { ...alert, resolvedVotes: alert.resolvedVotes + 1, updatedAt: now };
  const closes = alert.authorId === citizenId || shouldAutoResolve(updated);
  return closes ? { ...updated, status: 'resolvido', resolvedAt: now } : updated;
}

/* --------------------------------- Reducer -------------------------------- */

function reducer(state: AppDataState, action: Action): AppDataState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...action.payload, hydrated: true };

    case 'START_SESSION':
      return { ...state, session: action.session };

    case 'END_SESSION':
      return { ...state, session: null };

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.settings } };

    case 'ADD_ALERT':
      return {
        ...state,
        alerts: [action.alert, ...state.alerts],
        votes: { ...state.votes, [action.alert.id]: 'confirmou' },
      };

    case 'CONFIRM_ALERT': {
      if (state.votes[action.alertId]) return state; // 1 voto por alerta por aparelho
      let changed = false;
      const alerts = state.alerts.map((alert) => {
        if (alert.id !== action.alertId || alert.status !== 'ativo') return alert;
        changed = true;
        const upgrade =
          action.severityUpgrade && SEVERITIES[action.severityUpgrade].order > SEVERITIES[alert.severity].order
            ? action.severityUpgrade
            : alert.severity;
        return {
          ...alert,
          severity: upgrade,
          confirmations: alert.confirmations + 1,
          lastConfirmedAt: action.now,
          updatedAt: action.now,
        };
      });
      if (!changed) return state;
      return { ...state, alerts, votes: { ...state.votes, [action.alertId]: 'confirmou' } };
    }

    case 'RESOLVE_ALERT': {
      const target = state.alerts.find((alert) => alert.id === action.alertId);
      if (!target || !canResolve(state, target, action.citizenId)) return state;
      const updated = applyResolveVote(target, action.citizenId, action.now);
      return {
        ...state,
        alerts: state.alerts.map((alert) => (alert.id === action.alertId ? updated : alert)),
        votes: { ...state.votes, [action.alertId]: 'resolveu' },
      };
    }

    case 'ADD_SUPPORT_REQUEST':
      return {
        ...state,
        supportRequests: [action.request, ...state.supportRequests].slice(0, MAX_SUPPORT_REQUESTS),
      };

    case 'RESET_COMMUNITY_DATA':
      return {
        ...state,
        alerts: action.payload.alerts,
        votes: {},
        supportRequests: [],
      };

    default:
      return state;
  }
}

function toPersisted(state: AppDataState): PersistedAppState {
  const { hydrated: _hydrated, ...persisted } = state;
  return persisted;
}

/* -------------------------------- Contextos ------------------------------- */

const AppStateContext = createContext<AppDataState | null>(null);
const AppActionsContext = createContext<AppActions | null>(null);

const SAVE_DEBOUNCE_MS = 400;

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Ref com o estado mais recente: permite ações estáveis (useCallback sem deps de estado).
  const stateRef = useRef(state);
  stateRef.current = state;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // [MEMORY MANAGEMENT] Hidratação com cancelamento: nenhuma atualização após desmontar.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadAppState();
      if (cancelled) return;
      dispatch({ type: 'HYDRATE', payload: loaded ?? createSeedState() });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flushSave = useCallback(() => {
    if (!dirtyRef.current || !stateRef.current.hydrated) return;
    dirtyRef.current = false;
    saveAppState(toPersisted(stateRef.current)).catch((error) => {
      dirtyRef.current = true; // tenta de novo na próxima alteração
      console.warn('[storage] Falha ao salvar estado.', error);
    });
  }, []);

  // [MEMORY MANAGEMENT] Gravação com debounce: várias alterações seguidas viram 1 escrita.
  // O timer anterior é sempre limpo no cleanup, inclusive ao desmontar.
  useEffect(() => {
    if (!state.hydrated) return;
    dirtyRef.current = true;
    saveTimerRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [state.hydrated, state.session, state.settings, state.alerts, state.votes, state.supportRequests, flushSave]);

  // [MEMORY MANAGEMENT] Ao ir para segundo plano grava imediatamente; listener removido no cleanup.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'background' || status === 'inactive') flushSave();
    });
    return () => {
      subscription.remove();
      flushSave(); // garante a última gravação se o provider desmontar
    };
  }, [flushSave]);

  /* ------------------------------- Ações ---------------------------------- */

  const startSession = useCallback((displayName: string) => {
    const name = displayName.trim() || 'Cidadão';
    dispatch({
      type: 'START_SESSION',
      session: { citizenId: createId('cidadao'), displayName: name, startedAt: new Date().toISOString() },
    });
  }, []);

  const endSession = useCallback(() => dispatch({ type: 'END_SESSION' }), []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', settings });
  }, []);

  const reportBarrier = useCallback((input: NewReportInput): ReportResult => {
    const current = stateRef.current;
    const now = new Date().toISOString();

    // Evita duplicidade: mesmo trecho + mesma categoria ativa vira confirmação.
    const existing = current.alerts.find(
      (alert) => alert.status === 'ativo' && alert.segmentId === input.segmentId && alert.category === input.category,
    );
    if (existing) {
      dispatch({ type: 'CONFIRM_ALERT', alertId: existing.id, now, severityUpgrade: input.severity });
      return { alert: existing, merged: true };
    }

    const session = current.session;
    const alert: CommunityAlert = {
      id: createId('alerta'),
      segmentId: input.segmentId,
      category: input.category,
      severity: input.severity,
      reference: input.reference.trim(),
      description: input.description.trim(),
      createdAt: now,
      updatedAt: now,
      lastConfirmedAt: now,
      confirmations: 1,
      resolvedVotes: 0,
      status: 'ativo',
      authorId: session?.citizenId ?? 'anonimo',
      authorName: session?.displayName ?? 'Cidadão',
    };
    dispatch({ type: 'ADD_ALERT', alert });
    return { alert, merged: false };
  }, []);

  const confirmAlert = useCallback((alertId: string): VoteResult => {
    const current = stateRef.current;
    const alert = current.alerts.find((a) => a.id === alertId);
    if (!alert || alert.status !== 'ativo') return 'indisponivel';
    if (current.votes[alertId]) return 'ja_votou';
    dispatch({ type: 'CONFIRM_ALERT', alertId, now: new Date().toISOString() });
    return 'registrado';
  }, []);

  const markAlertResolved = useCallback((alertId: string): VoteResult => {
    const current = stateRef.current;
    const citizenId = current.session?.citizenId ?? 'anonimo';
    const alert = current.alerts.find((a) => a.id === alertId);
    if (!alert || alert.status !== 'ativo') return 'indisponivel';
    if (!canResolve(current, alert, citizenId)) return 'ja_votou';
    const now = new Date().toISOString();
    const preview = applyResolveVote(alert, citizenId, now);
    dispatch({ type: 'RESOLVE_ALERT', alertId, citizenId, now });
    return preview.status === 'resolvido' ? 'encerrado' : 'registrado';
  }, []);

  const registerSupportRequest = useCallback(
    (input: Omit<SupportRequest, 'id' | 'createdAt'>): SupportRequest => {
      const request: SupportRequest = { ...input, id: createId('apoio'), createdAt: new Date().toISOString() };
      dispatch({ type: 'ADD_SUPPORT_REQUEST', request });
      return request;
    },
    [],
  );

  const resetDemoData = useCallback(() => {
    dispatch({ type: 'RESET_COMMUNITY_DATA', payload: createSeedState() });
  }, []);

  // [MEMORY MANAGEMENT] Objeto de ações criado uma única vez (todas as funções são estáveis).
  const actions = useMemo<AppActions>(
    () => ({
      startSession,
      endSession,
      updateSettings,
      reportBarrier,
      confirmAlert,
      markAlertResolved,
      registerSupportRequest,
      resetDemoData,
    }),
    [startSession, endSession, updateSettings, reportBarrier, confirmAlert, markAlertResolved, registerSupportRequest, resetDemoData],
  );

  return (
    <AppActionsContext.Provider value={actions}>
      <AppStateContext.Provider value={state}>{children}</AppStateContext.Provider>
    </AppActionsContext.Provider>
  );
}

export function useAppState(): AppDataState {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState deve ser usado dentro de <AppDataProvider>.');
  return context;
}

export function useAppActions(): AppActions {
  const context = useContext(AppActionsContext);
  if (!context) throw new Error('useAppActions deve ser usado dentro de <AppDataProvider>.');
  return context;
}
