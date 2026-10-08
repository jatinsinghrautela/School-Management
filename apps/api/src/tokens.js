import { id } from "./domain.js";
// Tokens are stored only as SHA-256 digests. Revoked rows retain audit-friendly metadata.
export function tokenRepository(store, type) {
  const rows = async () =>
    (await store.all("securityTokens")).filter(
      (r) => r.type === type && !r.revoked,
    );
  return {
    async get(key) {
      return (await rows()).find((r) => r.tokenHash === key);
    },
    async set(key, value) {
      const old = (await rows()).find((r) => r.tokenHash === key);
      return store.put("securityTokens", {
        ...value,
        id: old?.id || id(),
        type,
        tokenHash: key,
        revoked: false,
      });
    },
    async delete(key) {
      const row = (await rows()).find((r) => r.tokenHash === key);
      if (row) await store.put("securityTokens", { ...row, revoked: true });
    },
    async entries() {
      return (await rows()).map((r) => [r.tokenHash, r]);
    },
  };
}
