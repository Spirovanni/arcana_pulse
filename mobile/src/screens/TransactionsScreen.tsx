import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, SafeAreaView, Text, View } from "react-native";
import { getTransactions } from "../lib/api";
import type { SimpleListItem } from "../types";

export default function TransactionsScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SimpleListItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getTransactions();
      const list = (data?.items ?? data?.transactions ?? []) as Array<Record<string, unknown>>;
      if (mounted) {
        setItems(
          list.map((txn, idx) => ({
            id: String(txn.transactionId ?? idx),
            title: String(txn.title ?? "Transaction"),
            subtitle: String(txn.date ?? ""),
            value: typeof txn.amount === "number" ? `$${txn.amount.toFixed(2)}` : undefined,
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
        <Text style={{ color: "#fff", fontSize: 22, marginBottom: 12 }}>Transactions</Text>
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
