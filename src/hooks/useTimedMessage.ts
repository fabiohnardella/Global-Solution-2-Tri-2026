import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/* ==========================================================================
 * Mensagem de feedback temporária (toast acessível) com timer sempre limpo.
 * ========================================================================== */

export type FeedbackTone = 'success' | 'info' | 'danger';

export interface FeedbackMessage {
  text: string;
  tone: FeedbackTone;
}

export function useTimedMessage(durationMs = 6000) {
  const [message, setMessage] = useState<FeedbackMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setMessage(null);
  }, []);

  const show = useCallback(
    (text: string, tone: FeedbackTone = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage({ text, tone });
      // Leitores de tela anunciam a mensagem mesmo sem foco nela.
      AccessibilityInfo.announceForAccessibility(text);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setMessage(null);
      }, durationMs);
    },
    [durationMs],
  );

  // [MEMORY MANAGEMENT] Timer pendente é cancelado ao desmontar a tela.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { message, show, clear };
}
