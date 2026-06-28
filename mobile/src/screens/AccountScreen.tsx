import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";

type AccountScreenProps = {
  onSignOut: () => void;
  onSyncNow: () => void;
  syncing: boolean;
  pendingMutations: number;
  conflictCount: number;
  email: string;
};

export default function AccountScreen({
  onSignOut,
  onSyncNow,
  syncing,
  pendingMutations,
  conflictCount,
  email,
}: AccountScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#060606" }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ color: "#fff", fontSize: 22 }}>Account</Text>
        <Text style={{ color: "#a3a3a3" }}>{email}</Text>
        <View style={{ backgroundColor: "#111", padding: 12, borderRadius: 8, gap: 4 }}>
          <Text style={{ color: "#fff", fontSize: 14 }}>Offline sync</Text>
          <Text style={{ color: "#a3a3a3", fontSize: 12 }}>
            Pending mutations: {pendingMutations}
          </Text>
          <Text style={{ color: conflictCount > 0 ? "#f87171" : "#a3a3a3", fontSize: 12 }}>
            Conflicts: {conflictCount}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onSyncNow}
          disabled={syncing}
          style={{ backgroundColor: syncing ? "#444" : "#1f2937", padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: "#fff", fontWeight: "700", textAlign: "center" }}>
            {syncing ? "Syncing..." : "Sync now"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSignOut}
          style={{ backgroundColor: "#c5a059", padding: 12, borderRadius: 8, marginTop: 8 }}
        >
          <Text style={{ color: "#000", fontWeight: "700", textAlign: "center" }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
