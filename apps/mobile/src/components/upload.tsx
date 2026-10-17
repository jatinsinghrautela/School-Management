import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { Form, useAlive, type Input } from "./workflow";
import { Button, Copy, ErrorText } from "./ui";
import { useMobile } from "../provider";
export function Upload({
  path,
  title,
  fields,
  done,
  uploaded,
}: {
  path: string;
  title: string;
  fields: Input[];
  done?: () => void;
  uploaded?: (result: unknown) => void;
}) {
  const { session } = useMobile();
  const alive = useAlive();
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(
    null,
  );
  const [error, setError] = useState("");
  useEffect(
    () => () => {
      if (asset && Platform.OS !== "web") {
        try {
          const file = new File(asset.uri);
          if (file.exists) file.delete();
        } catch {
          /* Retry through startup cache cleanup where possible. */
        }
      }
    },
    [asset],
  );
  async function pick() {
    const scope = session.scope();
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/png", "image/jpeg"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const selected = result.assets[0];
      if (!alive() || scope !== session.scope()) {
        if (Platform.OS !== "web") {
          try {
            const file = new File(selected.uri);
            if (file.exists) file.delete();
          } catch {
            /* Temporary picker cache only. */
          }
        }
        return;
      }
      if (!selected.size || selected.size > 5 * 1024 * 1024)
        throw Error("Choose a PDF, PNG or JPEG of at most 5 MB.");
      setAsset(selected);
    } catch (e) {
      if (scope === session.scope())
        setError(e instanceof Error ? e.message : "Could not choose file");
    }
  }
  return (
    <>
      <Button
        label="Choose PDF or image"
        secondary
        onPress={() => void pick()}
      />
      <ErrorText message={error} />
      {asset ? (
        <>
          <Copy>Selected: {asset.name}</Copy>
          <Form
            key={asset.uri}
            title={title}
            fields={fields}
            submit={async (data) => {
              const body = new FormData();
              if (Platform.OS === "web" && asset.file)
                body.append("file", asset.file);
              else
                body.append("file", {
                  uri: asset.uri,
                  name: asset.name,
                  type: asset.mimeType || "application/octet-stream",
                } as unknown as Blob);
              for (const [key, v] of Object.entries(data)) body.append(key, v);
              try {
                const result = await session.school(path, body);
                uploaded?.(result);
                return result;
              } finally {
                if (Platform.OS !== "web") {
                  const file = new File(asset.uri);
                  try {
                    if (file.exists) file.delete();
                  } catch {
                    /* Cleanup must not turn a saved upload into a failed write. */
                  }
                }
              }
            }}
            done={done}
          />
        </>
      ) : null}
    </>
  );
}
