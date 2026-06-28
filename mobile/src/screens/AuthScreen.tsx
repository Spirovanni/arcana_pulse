import { useState } from "react";
import { ActivityIndicator, SafeAreaView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { signInMobileSession, type MobileSession } from "../lib/auth";

type AuthScreenProps = {
  onSignedIn: (session: MobileSession) => void;
};

export default function AuthScreen({ onSignedIn }: AuthScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const session = await signInMobileSession({
        email: email.trim().toLowerCase(),
        password,
        mfaCode: mfaCode.trim() || undefined,
      });
      onSignedIn(session);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#060606" }}>
      <View style={{ flex: 1, justifyContent: "center", padding: 20, gap: 10 }}>
        <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>Arcana Pulse</Text>
        <Text style={{ color: "#a3a3a3", marginBottom: 12 }}>
          Sign in to securely connect your mobile session.
        </Text>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          style={{ backgroundColor: "#121212", color: "#fff", padding: 12, borderRadius: 8 }}
        />
        <TextInput
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          style={{ backgroundColor: "#121212", color: "#fff", padding: 12, borderRadius: 8 }}
        />
        <TextInput
          placeholder="MFA code (if enabled)"
          placeholderTextColor="#666"
          value={mfaCode}
          onChangeText={setMfaCode}
          style={{ backgroundColor: "#121212", color: "#fff", padding: 12, borderRadius: 8 }}
        />

        {error ? <Text style={{ color: "#f87171" }}>{error}</Text> : null}

        <TouchableOpacity
          disabled={loading}
          onPress={submit}
          style={{
            backgroundColor: loading ? "#444" : "#c5a059",
            padding: 12,
            borderRadius: 8,
            marginTop: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ color: "#000", fontWeight: "700", textAlign: "center" }}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
