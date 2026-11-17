import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import {
  AccessibleButton,
  AppHeader,
  AppText,
  FilterChip,
  ProfileSelector,
  StatusBanner,
} from '../components';
import { useAppActions, useAppState } from '../context/AppDataContext';
import { useAppTheme } from '../context/ThemeContext';
import { useSpeech } from '../hooks/useSpeech';
import { useTimedMessage } from '../hooks/useTimedMessage';
import type { IoniconName, MobilityProfileId, PeriodSetting } from '../types';
import { formatRelativeTime } from '../utils/format';

/* ==========================================================================
 * Ajustes: perfil, voz, exibição, histórico de pedidos de apoio e dados demo.
 * ========================================================================== */

const RATE_OPTIONS: { value: number; label: string }[] = [
  { value: 0.75, label: 'Lenta' },
  { value: 0.95, label: 'Normal' },
  { value: 1.2, label: 'Rápida' },
];

const PERIOD_OPTIONS: { value: PeriodSetting; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'dia', label: 'Sempre dia' },
  { value: 'noite', label: 'Sempre noite' },
];

interface SwitchRowProps {
  icon: IoniconName;
  label: string;
  description: string;
  value: boolean;
  onToggle: () => void;
}

/** Linha inteira clicável (área de toque grande) com Switch nativo. */
function SwitchRowBase({ icon, label, description, value, onToggle }: SwitchRowProps) {
  const { theme } = useAppTheme();
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={`${label}. ${description}`}
      style={({ pressed }) => [
        styles.switchRow,
        {
          minHeight: theme.touchTarget + 16,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderWidth: theme.borderWidth,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <Ionicons name={icon} size={26 * theme.fontScale} color={theme.colors.text} />
      <View style={styles.flex}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption" color="textMuted">
          {description}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.primary }}
        thumbColor={theme.isHighContrast ? theme.colors.text : undefined}
      />
    </Pressable>
  );
}

const SwitchRow = memo(SwitchRowBase);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { theme } = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

export function SettingsScreen() {
  const { theme, highContrast, largeText, toggleHighContrast, toggleLargeText } = useAppTheme();
  const { settings, session, supportRequests } = useAppState();
  const { updateSettings, resetDemoData, endSession } = useAppActions();
  const { speak } = useSpeech({ enabled: settings.voiceEnabled, rate: settings.speechRate });
  const { message, show, clear } = useTimedMessage(5000);

  const handleProfile = useCallback((profile: MobilityProfileId) => updateSettings({ profile }), [updateSettings]);
  const toggleVoice = useCallback(
    () => updateSettings({ voiceEnabled: !settings.voiceEnabled }),
    [updateSettings, settings.voiceEnabled],
  );
  const handleRate = useCallback((value: string) => updateSettings({ speechRate: Number(value) }), [updateSettings]);
  const handlePeriod = useCallback((value: string) => updateSettings({ period: value as PeriodSetting }), [updateSettings]);

  const testVoice = useCallback(() => {
    if (!settings.voiceEnabled) {
      show('Ligue a leitura em voz alta para testar.', 'info');
      return;
    }
    speak('Atenção: rampa interditada a 50 metros. Esquina com a Rua Cardeal Arcoverde.');
  }, [settings.voiceEnabled, speak, show]);

  const confirmReset = useCallback(() => {
    Alert.alert(
      'Restaurar dados de demonstração?',
      'Os alertas voltam ao estado inicial e seus votos e pedidos de apoio são apagados. Perfil e preferências são mantidos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            resetDemoData();
            show('Dados de demonstração restaurados.', 'success');
          },
        },
      ],
    );
  }, [resetDemoData, show]);

  const confirmExit = useCallback(() => {
    Alert.alert('Sair?', 'Você volta para a tela inicial. Seus reportes continuam salvos no aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: endSession },
    ]);
  }, [endSession]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Ajustes" subtitle={session ? `Olá, ${session.displayName}` : undefined} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.xl, paddingBottom: theme.spacing.xxl }}>
        {message ? <StatusBanner text={message.text} tone={message.tone} onDismiss={clear} /> : null}

        <Section title="Perfil de mobilidade">
          <ProfileSelector value={settings.profile} onChange={handleProfile} />
        </Section>

        <Section title="Exibição">
          <SwitchRow
            icon="contrast"
            label="Alto contraste"
            description="Fundo preto, texto branco e destaques em amarelo."
            value={highContrast}
            onToggle={toggleHighContrast}
          />
          <SwitchRow
            icon="text"
            label="Texto grande"
            description="Aumenta em 20% todos os textos do app."
            value={largeText}
            onToggle={toggleLargeText}
          />
        </Section>

        <Section title="Voz">
          <SwitchRow
            icon="volume-high"
            label="Leitura em voz alta"
            description="Instruções e avisos de obstáculos na navegação."
            value={settings.voiceEnabled}
            onToggle={toggleVoice}
          />
          <AppText variant="label">Velocidade da fala</AppText>
          <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: theme.spacing.sm }]}>
            {RATE_OPTIONS.map((o) => (
              <FilterChip
                key={o.value}
                value={String(o.value)}
                label={o.label}
                selected={Math.abs(settings.speechRate - o.value) < 0.01}
                onPress={handleRate}
              />
            ))}
          </View>
          <AccessibleButton label="Testar voz" icon="play" variant="secondary" onPress={testVoice} />
        </Section>

        <Section title="Horário considerado nas rotas">
          <AppText variant="caption" color="textMuted">
            À noite, iluminação e movimento pesam mais no Índice de Segurança.
          </AppText>
          <View accessibilityRole="radiogroup" style={[styles.wrap, { gap: theme.spacing.sm }]}>
            {PERIOD_OPTIONS.map((o) => (
              <FilterChip key={o.value} value={o.value} label={o.label} selected={settings.period === o.value} onPress={handlePeriod} />
            ))}
          </View>
        </Section>

        <Section title="Pedidos de apoio recentes">
          {supportRequests.length === 0 ? (
            <AppText variant="body" color="textMuted">
              Nenhum pedido registrado.
            </AppText>
          ) : (
            // Lista curta e limitada (5 itens): map em ScrollView, sem FlatList aninhada.
            supportRequests.slice(0, 5).map((r) => (
              <View
                key={r.id}
                accessible
                style={{
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderWidth: theme.borderWidth,
                }}
              >
                <AppText variant="label" color={r.kind === 'emergencia' ? 'danger' : 'text'}>
                  {r.kind === 'emergencia' ? 'Ligação de emergência' : 'Pedido de apoio'} · {formatRelativeTime(r.createdAt)}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {r.routeName} — {r.locationLabel}
                </AppText>
              </View>
            ))
          )}
        </Section>

        <Section title="Dados">
          <AppText variant="caption" color="textMuted">
            Tudo fica salvo só neste aparelho (funciona offline). Dados de ruas e alertas são de demonstração.
          </AppText>
          <AccessibleButton label="Restaurar dados de demonstração" icon="refresh-circle" variant="secondary" fullWidth onPress={confirmReset} />
          <AccessibleButton label="Sair" icon="log-out" variant="danger" fullWidth onPress={confirmExit} />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.8 },
});
