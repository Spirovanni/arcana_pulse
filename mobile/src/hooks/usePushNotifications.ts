import { useEffect } from "react";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken } from "../lib/api";
import { getOrCreateDeviceId } from "../lib/storage";
import type { MobileSession } from "../lib/auth";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PushHookOptions = {
  session: MobileSession | null;
};

export function usePushNotifications({ session }: PushHookOptions) {
  useEffect(() => {
    if (!session) return;

    const configure = async () => {
      const permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId as
        | string
        | undefined;

      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const deviceId = await getOrCreateDeviceId();
      await registerPushToken({
        deviceId,
        expoPushToken: token.data,
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version,
      });
    };

    void configure();
  }, [session]);
}
