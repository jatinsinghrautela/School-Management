export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordChangeRequired?: boolean;
};
export type School = { id: string; name: string; city?: string; code?: string };
export type Identity = {
  user: User;
  schools: School[];
  mode: string;
  support?: unknown;
};
export type Workspace = {
  school: School;
  schoolSettings?: { logoDataUri?: string };
  classes?: unknown[];
  notices?: unknown[];
  resources?: unknown[];
  [key: string]: unknown;
};
export type Login = { token: string; user: User; mode: string };
export type Api = {
  school<T>(
    token: string,
    schoolId: string,
    path: string,
    body?: unknown,
  ): Promise<T>;
  prepare(): Promise<void>;
  login(email: string, password: string): Promise<Login>;
  me(token: string): Promise<Identity>;
  workspace(token: string, schoolId: string): Promise<Workspace>;
  logout(token: string): Promise<unknown>;
  changePassword(
    token: string,
    currentPassword: string,
    password: string,
  ): Promise<unknown>;
  forgotPassword(email: string): Promise<{ message: string }>;
};
export type Vault = {
  read(): Promise<string | null>;
  write(token: string): Promise<void>;
  clear(): Promise<void>;
};
// Never send a saved live token to a different server after a development URL change.
export function sessionStorageKey(base: string): string {
  return `schoolglass.session.${Array.from(base, (char) => char.charCodeAt(0).toString(16).padStart(2, "0")).join("")}`;
}
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export function apiBase(value: string, development: boolean): string {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["http:", "https:"].includes(url.protocol)
  )
    throw Error("Invalid API URL");
  if (url.protocol !== "https:" && !development)
    throw Error("Release builds require HTTPS");
  if (!["", "/", "/api", "/api/"].includes(url.pathname))
    throw Error("Use the server origin or /api URL");
  return `${url.origin}/api`;
}
export function createApi(
  base: string,
  fetcher: typeof fetch = fetch,
  timeout = 25000,
  startupTimeout = 90000,
): Api {
  async function request<T>(
    path: string,
    token?: string,
    body?: unknown,
    deadline = body === undefined && path.startsWith("/schools/")
      ? startupTimeout
      : timeout,
  ): Promise<T> {
    const multipart =
      typeof FormData !== "undefined" && body instanceof FormData;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), deadline);
    try {
      const response = await fetcher(`${base}${path}`, {
        method: body === undefined ? "GET" : "POST",
        signal: abort.signal,
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body !== undefined && !multipart
            ? { "Content-Type": "application/json" }
            : {}),
        },
        ...(body !== undefined
          ? { body: multipart ? (body as FormData) : JSON.stringify(body) }
          : {}),
      });
      const raw = await response.text();
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new ApiError(
          `The service returned an unexpected response (${response.status}). It may be waking up or showing a security challenge. Please try again.`,
          response.status,
        );
      }
      if (!response.ok)
        throw new ApiError(
          typeof data?.error === "string"
            ? data.error
            : `Request failed (${response.status})`,
          response.status,
        );
      return data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      const operation =
        path === "/ready"
          ? "Server connection"
          : path === "/auth/login"
            ? "Sign-in"
            : path === "/me"
              ? "Account validation"
              : path.endsWith("/workspace")
                ? "School workspace"
                : "Request";
      throw new ApiError(
        abort.signal.aborted
          ? `${operation} took too long. It may be waking up; please retry.`
          : `${operation} could not connect. Check your connection and try again.`,
        0,
      );
    } finally {
      clearTimeout(timer);
    }
  }
  return {
    school: (token, schoolId, path, body) => {
      if (!/^\/[a-z]/.test(path) || path.includes("..") || path.includes("\\"))
        throw new Error("Invalid school API path");
      return request(
        `/schools/${encodeURIComponent(schoolId)}${path}`,
        token,
        body,
      );
    },
    prepare: async () => {
      const result = await request<{ status: string }>(
        "/ready",
        undefined,
        undefined,
        startupTimeout,
      );
      if (result?.status !== "ready")
        throw new ApiError(
          "The school service is not ready yet. Please retry shortly.",
          503,
        );
    },
    login: (email, password) =>
      request("/auth/login", undefined, {
        email: email.trim().toLowerCase(),
        password,
      }),
    me: (token) => request("/me", token),
    workspace: (token, id) =>
      request(`/schools/${encodeURIComponent(id)}/workspace`, token),
    logout: (token) => request("/auth/logout", token, {}),
    changePassword: (token, currentPassword, password) =>
      request("/auth/change-password", token, { currentPassword, password }),
    forgotPassword: (email) =>
      request("/auth/forgot-password", undefined, {
        email: email.trim().toLowerCase(),
      }),
  };
}
