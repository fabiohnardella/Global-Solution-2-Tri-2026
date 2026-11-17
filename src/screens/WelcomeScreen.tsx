import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccessibleButton, AppText, DisplayToggles, ProfileSelector } from '../components';
import { useAppActions, useAppState } from '../context/AppDataContext';
import { useAppTheme } from '../context/ThemeContext';
import type { IoniconName, MobilityProfileId } from '../types';

/* ==========================================================================
 * Boas-vindas: entrada rápida "como Cidadão" (sem cadastro) + perfil.
 * ========================================================================== */

const HIGHLIGHTS: { icon: IoniconName; text: string }[] = [
  { icon: 'git-compare', text: 'Compare rotas por acessibilidade e segurança' },
  { icon: 'megaphone', text: 'Reporte barreiras em segundos' },
  { icon: 'people', text: 'Confirme alertas da comunidade' },
  { icon: 'volume-high', text: 'Navegue com instruções em voz alta' },
];

export function WelcomeScreen() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useAppState();
  const { startSession, updateSettings } = useAppActions();
  const [name, setName] = useState('');

  const handleProfile = useCallback((profile: MobilityProfileId) => updateSettings({ profile }), [updateSettings]);
  const handleEnter = useCallback(() => startSession(name), [startSession, name]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + theme.spacing.lg,
          paddingBottom: insets.bottom + theme.spacing.xxl,
          paddingHorizontal: theme.spacing.lg,
          gap: theme.spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.togglesRow}>
          <DisplayToggles />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Ionicons name="accessibility" size={56 * theme.fontScale} color={theme.colors.primary} />
          <AppText variant="display" accessibilityRole="header">
            Rotas Acessíveis SP
          </AppText>
          <AppText variant="bodyLarge" color="textMuted">
            Caminhos mais seguros e acessíveis para pessoas com deficiência, pessoas idosas e pedestres no centro
            de São Paulo. Funciona offline.
          </AppText>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          {HIGHLIGHTS.map((item) => (
            <View key={item.text} style={styles.highlight}>
              <Ionicons name={item.icon} size={24 * theme.fontScale} color={theme.colors.primary} />
              <AppText variant="body" style={styles.flex}>
                {item.text}
              </AppText>
            </View>
          ))}
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="label" nativeID="nameLabel">
            Como podemos te chamar? (opcional)
          </AppText>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Maria"
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel="Seu nome ou apelido, opcional"
            accessibilityLabelledBy="nameLabel"
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={handleEnter}
            style={[
              theme.typography.bodyLarge,
              {
                minHeight: theme.touchTarget + 8,
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: theme.borderWidth + 1,
                borderRadius: theme.radius.md,
                paddingHorizontal: theme.spacing.md,
              },
            ]}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText variant="title" accessibilityRole="header">
            Seu perfil de mobilidade
          </AppText>
          <AppText variant="caption" color="textMuted">
            Usado para dar mais peso ao que importa para você. Dá para trocar depois.
          </AppText>
          <ProfileSelector value={settings.profile} onChange={handleProfile} />
        </View>

        <AccessibleButton
          label="Entrar como Cidadão"
          icon="log-in"
          size="xl"
          fullWidth
          onPress={handleEnter}
          accessibilityHint="Entra no aplicativo sem cadastro"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  togglesRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
