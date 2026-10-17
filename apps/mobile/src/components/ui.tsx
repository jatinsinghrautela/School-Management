import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Icon } from "./icon";
import { LoadingMotion } from "./feedback";
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
  busy = false,
  icon = true,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  busy?: boolean;
  icon?: boolean;
}) {
  const { colors } = useMobile();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? colors.surface : colors.accent,
          borderColor: colors.line,
          opacity: disabled && !busy ? 0.5 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          gap: 10,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {busy ? (
          <LoadingMotion
            compact
            label={label}
            tint={secondary ? colors.ink : colors.onAccent}
          />
        ) : icon ? (
          <Icon
            name={label}
            size={19}
            color={secondary ? colors.ink : colors.onAccent}
          />
        ) : null}
        <Text
          style={{
            flexShrink: 1,
            fontSize: 15,
            fontWeight: "700",
            color: secondary ? colors.ink : colors.onAccent,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      </View>
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
export function Busy({ label = "Loading" }: { label?: string }) {
  return <LoadingMotion label={label} />;
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
  card: {
    padding: 17,
    borderRadius: 23,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#111c40",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 2,
  },
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
