import React, { useState } from "react";
import { Platform, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMobile } from "../provider";
import { localDate, parseDate } from "../core/dates";
import { Button, Copy } from "./ui";
export type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  disabled?: boolean;
};
export function DateField({
  label,
  value,
  onChange,
  optional = false,
  disabled = false,
}: DateFieldProps) {
  const { dark, colors } = useMobile();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Copy>{label}</Copy>
      <Button
        label={`${label}: ${parseDate(value) ? parseDate(value)!.toLocaleDateString() : "Select date"}`}
        secondary
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      {open && !disabled ? (
        <>
          <DateTimePicker
            value={parseDate(value) || new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            themeVariant={dark ? "dark" : "light"}
            accentColor={colors.accent}
            onChange={(event, selected) => {
              if (Platform.OS !== "ios") setOpen(false);
              if (event.type === "set" && selected)
                onChange(localDate(selected));
            }}
          />
          {Platform.OS === "ios" ? (
            <Button
              label="Done choosing date"
              secondary
              onPress={() => {
                if (!value) onChange(localDate());
                setOpen(false);
              }}
            />
          ) : null}
        </>
      ) : null}
      {optional && value ? (
        <Button
          label={`Clear ${label.toLowerCase()}`}
          secondary
          disabled={disabled}
          onPress={() => {
            setOpen(false);
            onChange("");
          }}
        />
      ) : null}
    </View>
  );
}
