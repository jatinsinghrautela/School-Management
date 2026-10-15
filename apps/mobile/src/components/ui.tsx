import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useMobile } from "../provider";
export function Copy({
  children,
  muted = false,
  large = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
  large?: boolean;
}) {
  const { colors } = useMobile();
  return (
    <Text
      style={{
        color: muted ? colors.muted : colors.ink,
        fontSize: large ? 28 : 15,
        lineHeight: large ? 35 : 23,
        fontWeight: large ? "700" : "400",
      }}
    >
      {children}
    </Text>
  );
}
export function Card({ children }: { children: React.ReactNode }) {
  const { colors } = useMobile();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.line },
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  const { colors } = useMobile();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.surface : colors.accent,
          borderColor: colors.line,
          opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: secondary ? colors.ink : colors.onAccent,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useMobile();
  return (
    <View style={{ gap: 6 }}>
      <Copy>{label}</Copy>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        {...props}
        style={[
          styles.input,
          {
            borderColor: colors.line,
            color: colors.ink,
            backgroundColor: colors.bg,
          },
        ]}
      />
    </View>
  );
}
export function Busy() {
  const { colors } = useMobile();
  return (
    <ActivityIndicator accessibilityLabel="Loading" color={colors.accent} />
  );
}
export function ErrorText({ message }: { message: string }) {
  const { colors } = useMobile();
  return message ? (
    <Text
      accessibilityRole="alert"
      style={{ color: colors.error, lineHeight: 22 }}
    >
      {message}
    </Text>
  ) : null;
}
const styles = StyleSheet.create({
  card: { padding: 20, borderRadius: 24, borderWidth: 1, gap: 16 },
  button: {
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 14,
    minHeight: 50,
    fontSize: 16,
  },
});
