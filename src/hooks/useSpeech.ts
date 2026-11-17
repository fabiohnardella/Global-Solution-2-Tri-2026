import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

/* ==========================================================================
 * Hook de síntese de voz (pt-BR) com limpeza garantida ao desmontar.
 * ========================================================================== */

interface UseSpeechOptions {
  enabled: boolean;
  rate: number;
}

interface SpeakOptions {
  /** Interrompe o que estiver sendo falado antes (padrão: true). */
  interrupt?: boolean;
  onDone?: () => void;
}

export interface SpeechController {
  speak: (text: string, options?: SpeakOptions) => void;
  stop: () => void;
  isSpeaking: boolean;
}

export function useSpeech({ enabled, rate }: UseSpeechOptions): SpeechController {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const mountedRef = useRef(true);

  const safeSetSpeaking = useCallback((value: boolean) => {
    if (mountedRef.current) setIsSpeaking(value);
  }, []);

  const stop = useCallback(() => {
    Speech.stop().catch(() => undefined);
    safeSetSpeaking(false);
  }, [safeSetSpeaking]);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}) => {
      if (!enabled || text.trim().length === 0) return;
      if (options.interrupt !== false) {
        Speech.stop().catch(() => undefined);
      }
      Speech.speak(text, {
        language: 'pt-BR',
        rate,
        pitch: 1,
        onStart: () => safeSetSpeaking(true),
        onDone: () => {
          safeSetSpeaking(false);
          // [MEMORY MANAGEMENT] Callback só roda se a tela ainda estiver montada.
          if (mountedRef.current) options.onDone?.();
        },
        onStopped: () => safeSetSpeaking(false),
        onError: () => safeSetSpeaking(false),
      });
    },
    [enabled, rate, safeSetSpeaking],
  );

  // Se o usuário desligar a voz no meio de uma fala, interrompe na hora.
  useEffect(() => {
    if (!enabled) {
      Speech.stop().catch(() => undefined);
      safeSetSpeaking(false);
    }
  }, [enabled, safeSetSpeaking]);

  // [MEMORY MANAGEMENT] Ao desmontar a tela: Speech.stop() obrigatório para não
  // continuar falando (e segurando o áudio) depois que o usuário saiu.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      Speech.stop().catch(() => undefined);
    };
  }, []);

  return { speak, stop, isSpeaking };
}
