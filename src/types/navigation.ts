import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Routes: undefined;
  Alerts: { segmentId?: string } | undefined;
  Report: { segmentId?: string } | undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  AssistedNavigation: { routeKey: string };
};

declare global {
  // Tipagem global para useNavigation() sem genéricos em todo o app.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
