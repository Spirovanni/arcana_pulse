import { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from "react-native";
import { getDashboard } from "../lib/api";

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getDashboard();
      if (mounted) {
        setRaw(JSON.stringify(data ?? {}, null, 2));
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#060606" }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: "#fff", fontSize: 22, marginBottom: 12 }}>Dashboard</Text>
        {loading ? (
          <ActivityIndicator color="#c5a059" />
        ) : (
          <Text style={{ color: "#a3a3a3", fontFamily: "Courier" }}>{raw}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
