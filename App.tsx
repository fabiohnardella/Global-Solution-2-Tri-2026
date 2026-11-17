import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDataProvider } from './src/context/AppDataContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';

/**
 * Rotas Acessíveis SP
 * Ordem dos providers: área segura → tema/acessibilidade → dados (AsyncStorage) → navegação.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppDataProvider>
          <AppNavigator />
        </AppDataProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
