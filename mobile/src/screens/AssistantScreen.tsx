import { useState } from "react";
import { Alert, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { askAssistant } from "../lib/api";

export default function AssistantScreen() {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const data = (await askAssistant(prompt.trim())) as {
        queued?: boolean;
        reply?: string;
        error?: string;
      };
      setReply(String(data?.reply ?? data?.error ?? "No response"));
      if (data?.queued) {
        Alert.alert(
          "Queued offline",
          "Your assistant request was queued and will run automatically once online."
        );
      }
    } catch {
      Alert.alert("Assistant error", "Could not complete request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#060606" }}>
      <View style={{ padding: 16, gap: 10 }}>
        <Text style={{ color: "#fff", fontSize: 22, marginBottom: 12 }}>Assistant</Text>
        <TextInput
          placeholder="Ask Arcana..."
          placeholderTextColor="#666"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          style={{
            backgroundColor: "#121212",
            color: "#fff",
            padding: 12,
            borderRadius: 8,
            minHeight: 100,
            textAlignVertical: "top",
          }}
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
            {loading ? "Thinking..." : "Send"}
          </Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: "#111", borderRadius: 8, padding: 12 }}>
          <Text style={{ color: "#a3a3a3" }}>{reply || "Assistant response will appear here."}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
