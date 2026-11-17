import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { DEFAULT_DISPLAY } from '../data/catalog';
import { buildTheme, type AppTheme } from '../theme/theme';
import type { DisplayPreferences } from '../types';
import { loadDisplayPreferences, saveDisplayPreferences } from './storage';

/* ==========================================================================
 * Contexto de exibição/acessibilidade: Alto Contraste, Texto Grande e leitor
 * de tela. Fica SEPARADO do contexto de dados para que mudanças nos alertas
 * não re-renderizem quem só consome o tema (e vice-versa).
 * ========================================================================== */

interface ThemeContextValue {
  theme: AppTheme;
  highContrast: boolean;
  largeText: boolean;
  /** true quando TalkBack/VoiceOver está ativo. */
  screenReaderEnabled: boolean;
  hydrated: boolean;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  setDisplayPreferences: (prefs: Partial<DisplayPreferences>) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<DisplayPreferences>(DEFAULT_DISPLAY);
  const [hydrated, setHydrated] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const skipNextSave = useRef(true);

  // [MEMORY MANAGEMENT] Carga assíncrona com flag de cancelamento: se o provider
  // desmontar antes do AsyncStorage responder, não chamamos setState em componente morto.
  useEffect(() => {
    let cancelled = false;
    loadDisplayPreferences().then((loaded) => {
      if (cancelled) return;
      setPrefs(loaded);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // [MEMORY MANAGEMENT] Assinatura do leitor de tela removida no cleanup (evita listener órfão).
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (!cancelled) setScreenReaderEnabled(enabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderEnabled);
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  // Persiste preferências após a hidratação (a primeira execução pós-carga é ignorada).
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveDisplayPreferences(prefs).catch((error) =>
      console.warn('[theme] Não foi possível salvar as preferências.', error),
    );
  }, [prefs, hydrated]);

  // [MEMORY MANAGEMENT] Callbacks estáveis: consumidores memoizados não re-renderizam à toa.
  const toggleHighContrast = useCallback(() => {
    setPrefs((current) => ({ ...current, highContrast: !current.highContrast }));
  }, []);

  const toggleLargeText = useCallback(() => {
    setPrefs((current) => ({ ...current, largeText: !current.largeText }));
  }, []);

  const setDisplayPreferences = useCallback((partial: Partial<DisplayPreferences>) => {
    setPrefs((current) => ({ ...current, ...partial }));
  }, []);

  // [MEMORY MANAGEMENT] O objeto de tema só é recriado quando contraste/tamanho mudam.
  const theme = useMemo(() => buildTheme(prefs.highContrast, prefs.largeText), [prefs.highContrast, prefs.largeText]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      highContrast: prefs.highContrast,
      largeText: prefs.largeText,
      screenReaderEnabled,
      hydrated,
      toggleHighContrast,
      toggleLargeText,
      setDisplayPreferences,
    }),
    [theme, prefs.highContrast, prefs.largeText, screenReaderEnabled, hydrated, toggleHighContrast, toggleLargeText, setDisplayPreferences],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme deve ser usado dentro de <ThemeProvider>.');
  return context;
}
