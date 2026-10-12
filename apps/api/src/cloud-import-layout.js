export function sameMigrationVersions(source, target) {
  return (
    JSON.stringify(source.map((r) => r.version).sort((a, b) => a - b)) ===
    JSON.stringify(target.map((r) => r.version).sort((a, b) => a - b))
  );
}
export function writableColumns(columns, layout) {
  const generated = new Set(
    layout
      .filter((c) => /\b(?:VIRTUAL|STORED) GENERATED\b/i.test(c.Extra || ""))
      .map((c) => c.Field),
  );
  return columns.filter((c) => !generated.has(c));
}
