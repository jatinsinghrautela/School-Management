export async function readApiResponse(response) {
  const text = await response.text();
  let result;
  try {
    result = text.trim() ? JSON.parse(text) : null;
  } catch {
    result = null;
  }
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    const message =
      response.status === 413
        ? "Upload exceeds the server size limit. Calendar workbooks must be at most 1 MB."
        : response.status === 429
          ? "Too many requests. Wait a few minutes before trying again."
          : `The server returned an empty or invalid response (HTTP ${response.status}). Check that the backend is running and connected to MySQL, then retry. No successful upload was confirmed.`;
    throw new Error(message);
  }
  return result;
}
