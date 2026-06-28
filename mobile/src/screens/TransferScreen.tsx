import { useState } from "react";
import { Alert, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { sendTransfer } from "../lib/api";

export default function TransferScreen() {
  const [senderBankId, setSenderBankId] = useState("");
  const [receiverShareableId, setReceiverShareableId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const parsed = Number(amount);
    if (!senderBankId || !receiverShareableId || !Number.isFinite(parsed)) {
      Alert.alert("Missing fields", "Fill all transfer fields.");
      return;
    }

    setLoading(true);
    try {
      const data = (await sendTransfer({
        senderBankId,
        receiverShareableId,
        amount: parsed,
      })) as { queued?: boolean; message?: string };
      if (data?.queued) {
        Alert.alert("Queued offline", data.message ?? "Transfer queued and will sync when online.");
      } else {
        Alert.alert("Transfer response", JSON.stringify(data));
      }
    } catch {
      Alert.alert("Transfer failed", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#060606" }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: "#fff", fontSize: 22, marginBottom: 12 }}>Transfer</Text>
        <TextInput
          placeholder="Sender bank id"
          placeholderTextColor="#666"
          value={senderBankId}
          onChangeText={setSenderBankId}
          style={{ backgroundColor: "#121212", color: "#fff", padding: 12, borderRadius: 8 }}
        />
        <TextInput
          placeholder="Receiver shareable id"
          placeholderTextColor="#666"
          value={receiverShareableId}
          onChangeText={setReceiverShareableId}
          style={{ backgroundColor: "#121212", color: "#fff", padding: 12, borderRadius: 8 }}
        />
        <TextInput
          placeholder="Amount"
          placeholderTextColor="#666"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          style={{ backgroundColor: "#121212", color: "#fff", padding: 12, borderRadius: 8 }}
        />
        <TouchableOpacity
          onPress={submit}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#444" : "#c5a059",
            padding: 12,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#000", fontWeight: "700", textAlign: "center" }}>
            {loading ? "Sending..." : "Send Transfer"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
