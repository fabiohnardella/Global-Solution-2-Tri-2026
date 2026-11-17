import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import { AppText } from './AppText';
import { DisplayToggles } from './DisplayToggles';
import { IconButton } from './IconButton';

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** Mostra botão "voltar" à esquerda. */
  onBack?: () => void;
  showDisplayToggles?: boolean;
}

function AppHeaderBase({ title, subtitle, onBack, showDisplayToggles = true }: AppHeaderProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + theme.spacing.sm,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: theme.borderWidth,
        },
      ]}
    >
      <View style={styles.row}>
        {onBack ? (
          <IconButton icon="arrow-back" accessibilityLabel="Voltar" onPress={onBack} />
        ) : null}
        <View style={styles.titles}>
          <AppText variant="headline" accessibilityRole="header" numberOfLines={2}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="textMuted" numberOfLines={2}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>
      {showDisplayToggles ? (
        <View style={[styles.toggles, { marginTop: theme.spacing.sm }]}>
          <DisplayToggles />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titles: { flex: 1 },
  toggles: { flexDirection: 'row', justifyContent: 'flex-end' },
});

export const AppHeader = memo(AppHeaderBase);
