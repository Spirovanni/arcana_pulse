import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, SafeAreaView, Text, View } from "react-native";
import { getBanks } from "../lib/api";
import type { SimpleListItem } from "../types";

export default function MyBanksScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SimpleListItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getBanks();
      const banks = (data?.banks ?? []) as Array<Record<string, unknown>>;
      if (mounted) {
        setItems(
          banks.map((bank, idx) => ({
            id: String(bank.bankId ?? idx),
            title: String(bank.institutionName ?? "Bank"),
            subtitle: String(bank.displayMask ?? ""),
            value:
              typeof bank.balance === "number"
                ? `$${bank.balance.toFixed(2)}`
                : undefined,
          }))
        );
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
      <View style={{ padding: 16, flex: 1 }}>
        <Text style={{ color: "#fff", fontSize: 22, marginBottom: 12 }}>My Banks</Text>
        {loading ? (
          <ActivityIndicator color="#c5a059" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ paddingVertical: 10, borderBottomColor: "#1f1f1f", borderBottomWidth: 1 }}>
                <Text style={{ color: "#fff" }}>{item.title}</Text>
                <Text style={{ color: "#888", fontSize: 12 }}>{item.subtitle}</Text>
                {item.value ? <Text style={{ color: "#c5a059" }}>{item.value}</Text> : null}
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
