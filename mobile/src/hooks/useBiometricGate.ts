import { useEffect, useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";

export function useBiometricGate() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) {
          if (mounted) {
            setAuthorized(true);
            setChecking(false);
          }
          return;
        }

        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
          if (mounted) {
            setAuthorized(true);
            setChecking(false);
          }
          return;
        }

        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Unlock Arcana Pulse",
          fallbackLabel: "Use device passcode",
        });
        if (mounted) {
          setAuthorized(result.success);
          setChecking(false);
        }
      } catch {
        if (mounted) {
          setAuthorized(true);
          setChecking(false);
        }
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  return { checking, authorized };
}
