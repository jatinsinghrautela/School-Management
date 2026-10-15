import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { artifactName, type Artifact } from "./core/daily";
export function clearTemporaryArtifacts() {
  if (Platform.OS === "web") return;
  const directory = new Directory(Paths.cache, "schoolglass-private");
  if (directory.exists)
    for (const entry of directory.list())
      if (entry instanceof File) entry.delete();
}
export async function shareArtifact(
  artifact: Artifact,
  isCurrent: () => boolean,
) {
  if (!isCurrent()) return;
  if (Platform.OS === "web")
    throw Error("Use the native Android/iOS app to share private documents.");
  if (!(await Sharing.isAvailableAsync()))
    throw Error("File sharing is not available on this device.");
  if (!isCurrent()) return;
  if (!artifact.html && !artifact.base64)
    throw Error("Document content is unavailable.");
  if (
    (artifact.base64?.length || artifact.html?.length || 0) >
    12 * 1024 * 1024
  )
    throw Error("Document is too large for this preview.");
  const directory = new Directory(Paths.cache, "schoolglass-private");
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(
    directory,
    `sg-${Date.now()}-${artifactName(artifact.filename)}`,
  );
  try {
    file.create();
    file.write(artifact.html || artifact.base64 || "", {
      encoding: artifact.html ? "utf8" : "base64",
    });
    if (!isCurrent()) return;
    await Sharing.shareAsync(file.uri, {
      mimeType:
        artifact.mime ||
        (artifact.html ? "text/html" : "application/octet-stream"),
      dialogTitle: "Share school document",
    });
  } finally {
    if (file.exists) file.delete();
  }
}
