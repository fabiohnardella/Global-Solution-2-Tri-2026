import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText } from '../components';
import { useAppState } from '../context/AppDataContext';
import { useAppTheme } from '../context/ThemeContext';
import { AlertsScreen } from '../screens/AlertsScreen';
import { AssistedNavigationScreen } from '../screens/AssistedNavigationScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { RoutesScreen } from '../screens/RoutesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import type { IoniconName } from '../types';
import type { MainTabParamList, RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_META: Record<keyof MainTabParamList, { label: string; icon: IoniconName; iconActive: IoniconName; hint: string }> = {
  Routes: { label: 'Rotas', icon: 'map-outline', iconActive: 'map', hint: 'Buscar e comparar rotas' },
  Alerts: { label: 'Alertas', icon: 'notifications-outline', iconActive: 'notifications', hint: 'Feed de alertas da comunidade' },
  Report: { label: 'Reportar', icon: 'add-circle-outline', iconActive: 'add-circle', hint: 'Reportar uma barreira' },
  Settings: { label: 'Ajustes', icon: 'settings-outline', iconActive: 'settings', hint: 'Perfil, voz e exibição' },
};

function MainTabs() {
  const { theme } = useAppTheme();
  const { alerts } = useAppState();

  // [MEMORY MANAGEMENT] Contagem do badge memoizada pela lista de alertas.
  const severeCount = useMemo(
    () => alerts.filter((a) => a.status === 'ativo' && (a.severity === 'alta' || a.severity === 'critica')).length,
    [alerts],
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const meta = TAB_META[route.name];
        return {
          headerShown: false,
          tabBarLabel: meta.label,
          tabBarAccessibilityLabel: `${meta.label}. ${meta.hint}`,
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? meta.iconActive : meta.icon} size={size * theme.fontScale} color={color} />
          ),
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textMuted,
          tabBarLabelStyle: { fontSize: 13 * theme.fontScale, fontWeight: '700' },
          tabBarItemStyle: { minHeight: theme.touchTarget + 8, paddingVertical: 4 },
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            borderTopWidth: theme.borderWidth,
          },
          // [MEMORY MANAGEMENT] lazy: cada aba só é montada no primeiro acesso, o que
          // reduz o custo de abertura. Depois ela fica montada e o rascunho do formulário é preservado.
          lazy: true,
        };
      }}
    >
      <Tab.Screen name="Routes" component={RoutesScreen} />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          tabBarBadge: severeCount > 0 ? severeCount : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.colors.danger, color: theme.colors.onDanger, fontWeight: '800' },
        }}
      />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  const { theme } = useAppTheme();
  return (
    <View
      accessible
      accessibilityLabel="Carregando dados do aplicativo"
      style={[styles.loading, { backgroundColor: theme.colors.background }]}
    >
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <AppText variant="bodyLarge">Carregando rotas e alertas…</AppText>
    </View>
  );
}

export function AppNavigator() {
  const { theme, hydrated: themeHydrated } = useAppTheme();
  const { hydrated, session } = useAppState();

  // [MEMORY MANAGEMENT] Tema da navegação recriado só quando o tema do app muda.
  const navigationTheme = useMemo<Theme>(() => {
    const base = theme.isHighContrast ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.danger,
      },
    };
  }, [theme]);

  if (!hydrated || !themeHydrated) {
    return (
      <>
        <StatusBar style={theme.isHighContrast ? 'light' : 'dark'} />
        <LoadingScreen />
      </>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <StatusBar style={theme.isHighContrast ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="AssistedNavigation"
              component={AssistedNavigationScreen}
              options={{ gestureEnabled: false, animation: 'slide_from_bottom' }}
            />
          </>
        ) : (
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
});
