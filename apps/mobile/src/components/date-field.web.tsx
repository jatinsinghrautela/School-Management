import React from "react";
import { View } from "react-native";
import { useMobile } from "../provider";
import { Copy } from "./ui";
import type { DateFieldProps } from "./date-field";
export function DateField({
  label,
  value,
  onChange,
  optional = false,
  disabled = false,
}: DateFieldProps) {
  const { colors, dark } = useMobile();
  return (
    <View style={{ gap: 8 }}>
      <Copy>{label}</Copy>
      {React.createElement("input", {
        type: "date",
        "aria-label": label,
        value,
        disabled,
        required: !optional,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value),
        style: {
          boxSizing: "border-box",
          width: "100%",
          minWidth: 0,
          minHeight: 50,
          padding: 12,
          borderRadius: 13,
          border: `1px solid ${colors.line}`,
          color: colors.ink,
          backgroundColor: colors.bg,
          colorScheme: dark ? "dark" : "light",
          fontFamily: "inherit",
          fontSize: 16,
        },
      })}
    </View>
  );
}
