import { Alert, Platform } from "react-native";

/** Dismissal never changes the session; only explicit confirmation signs out. */
export function confirmSignOut(onConfirm: () => void, dark: boolean) {
  const message = "Are you sure you want to sign out of Schoolglass Desk?";
  if (Platform.OS === "web") {
    if (globalThis.confirm(message)) onConfirm();
    return;
  }
  Alert.alert(
    "Sign out?",
    message,
    [
      { text: "Cancel", style: "cancel", isPreferred: true },
      { text: "Sign out", style: "destructive", onPress: onConfirm },
    ],
    { cancelable: true, userInterfaceStyle: dark ? "dark" : "light" },
  );
}
