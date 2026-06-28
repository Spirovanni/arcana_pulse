import { useEffect, useState } from "react";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, AppState, Text, View } from "react-native";
import DashboardScreen from "./src/screens/DashboardScreen";
import TransactionsScreen from "./src/screens/TransactionsScreen";
import MyBanksScreen from "./src/screens/MyBanksScreen";
import TransferScreen from "./src/screens/TransferScreen";
import AssistantScreen from "./src/screens/AssistantScreen";
import AuthScreen from "./src/screens/AuthScreen";
import AccountScreen from "./src/screens/AccountScreen";
import { useBiometricGate } from "./src/hooks/useBiometricGate";
import { usePushNotifications } from "./src/hooks/usePushNotifications";
import { getMobileSession, signOutMobileSession, type MobileSession } from "./src/lib/auth";
import {
  getMobileOfflineSyncStatus,
  syncOfflineMutations,
  unregisterPushToken,
} from "./src/lib/api";
import { getOrCreateDeviceId } from "./src/lib/storage";

const Tab = createBottomTabNavigator();

export default function App() {
  const { checking, authorized } = useBiometricGate();
  const [sessionLoading, setSessionLoading] = useState(true);
  const [session, setSession] = useState<MobileSession | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState({ pendingMutations: 0, conflictCount: 0 });
  usePushNotifications({ session });

  const refreshSyncStats = async () => {
    const status = await getMobileOfflineSyncStatus();
    setSyncStats(status);
  };

  const runOfflineSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncOfflineMutations();
    } finally {
      await refreshSyncStats();
      setSyncing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const bootstrap = async () => {
      const activeSession = await getMobileSession();
      if (mounted) {
        setSession(activeSession);
        await refreshSyncStats();
        setSessionLoading(false);
      }
    };
    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    void runOfflineSync();
    const interval = setInterval(() => {
      void runOfflineSync();
    }, 30_000);

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") void runOfflineSync();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, [session]);

  if (checking || sessionLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#060606",
        }}
      >
        <ActivityIndicator color="#c5a059" />
      </View>
    );
  }

  if (!authorized) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#060606",
          padding: 24,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18, marginBottom: 8 }}>Authentication Required</Text>
        <Text style={{ color: "#a3a3a3", textAlign: "center" }}>
          Please relaunch the app and authenticate with Face ID / Touch ID.
        </Text>
      </View>
    );
  }

  if (!session) {
    return <AuthScreen onSignedIn={setSession} />;
  }

  return (
    <NavigationContainer
      theme={{
        ...DarkTheme,
        colors: {
          ...DarkTheme.colors,
          background: "#060606",
          card: "#0b0b0b",
          primary: "#c5a059",
          text: "#f5f5f5",
        },
      }}
    >
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: "#0b0b0b", borderTopColor: "#1f1f1f" },
          tabBarActiveTintColor: "#c5a059",
          tabBarInactiveTintColor: "#777",
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Transactions" component={TransactionsScreen} />
        <Tab.Screen name="My Banks" component={MyBanksScreen} />
        <Tab.Screen name="Transfer" component={TransferScreen} />
        <Tab.Screen name="Assistant" component={AssistantScreen} />
        <Tab.Screen name="Account">
          {() => (
            <AccountScreen
              email={session.user.email}
              syncing={syncing}
              pendingMutations={syncStats.pendingMutations}
              conflictCount={syncStats.conflictCount}
              onSyncNow={() => {
                void runOfflineSync();
              }}
              onSignOut={async () => {
                const deviceId = await getOrCreateDeviceId();
                await unregisterPushToken({ deviceId }).catch(() => undefined);
                await signOutMobileSession();
                setSession(null);
                await refreshSyncStats();
              }}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
