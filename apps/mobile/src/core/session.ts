import { ApiError } from "./api.ts";
import type { Api, Identity, Vault, Workspace } from "./api.ts";
export type SessionState = {
  status: "restoring" | "signedOut" | "locked" | "ready";
  identity: Identity | null;
  schoolId: string;
  schoolChoiceRequired: boolean;
  workspace: Workspace | null;
  busy: boolean;
  error: string;
  activity: string;
};
const initial = (): SessionState => ({
  status: "restoring",
  identity: null,
  schoolId: "",
  schoolChoiceRequired: false,
  workspace: null,
  busy: false,
  error: "",
  activity: "",
});
export class Session {
  state = initial();
  private api: Api;
  private vault: Vault;
  private notify: () => void;
  private token = "";
  private generation = 0;
  private schoolVersion = 0;
  private writes = Promise.resolve();
  constructor(api: Api, vault: Vault, notify: () => void) {
    this.api = api;
    this.vault = vault;
    this.notify = notify;
  }
  private update(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }
  scope() {
    return `${this.generation}:${this.schoolVersion}`;
  }
  async school<T>(path: string, body?: unknown): Promise<T> {
    const scope = this.scope(),
      schoolId = this.state.schoolId;
    if (
      this.state.status !== "ready" ||
      !schoolId ||
      this.state.schoolChoiceRequired ||
      this.state.identity?.user.passwordChangeRequired
    )
      throw Error("Open an authorized school workspace first.");
    try {
      const result = await this.api.school<T>(this.token, schoolId, path, body);
      if (scope !== this.scope())
        throw Error("School context changed. Please reopen this view.");
      return result;
    } catch (error) {
      if (
        scope === this.scope() &&
        error instanceof ApiError &&
        error.status === 401
      )
        await this.clear("Your session ended. Please sign in again.");
      throw error;
    }
  }
  private persist(action: () => Promise<void>, generation: number) {
    const next = this.writes
      .catch(() => {})
      .then(async () => {
        if (generation === this.generation) await action();
      });
    this.writes = next;
    return next;
  }
  async restore() {
    const selectedSchool = this.state.schoolId;
    const g = ++this.generation;
    this.update({ ...initial() });
    try {
      await this.writes.catch(() => {});
      const token = await this.vault.read();
      if (g !== this.generation) return;
      if (!token) {
        this.update({ status: "signedOut" });
        return;
      }
      this.token = token;
      this.update({
        activity:
          "Connecting to your school. First connection can take up to 90 seconds.",
      });
      await this.api.prepare();
      if (g !== this.generation) return;
      await this.identify(g, selectedSchool);
    } catch (error) {
      if (g === this.generation)
        this.update({
          status: "locked",
          identity: null,
          workspace: null,
          error:
            error instanceof Error
              ? error.message
              : "Session could not be restored",
        });
    }
  }
  private async identify(g: number, selectedSchool = "") {
    try {
      const identity = await this.api.me(this.token);
      if (g !== this.generation) return;
      this.update({
        status: "ready",
        identity,
        schoolChoiceRequired:
          identity.user.role === "director" &&
          identity.schools.length > 1 &&
          !identity.schools.some((s) => s.id === selectedSchool),
        error: "",
        busy: false,
        activity: "",
      });
      if (
        !identity.user.passwordChangeRequired &&
        identity.user.role !== "owner" &&
        identity.schools.length &&
        !(
          identity.user.role === "director" &&
          identity.schools.length > 1 &&
          !identity.schools.some((s) => s.id === selectedSchool)
        )
      )
        await this.selectSchool(
          identity.schools.find((s) => s.id === selectedSchool)?.id ||
            identity.schools[0].id,
        );
    } catch (error) {
      if (g !== this.generation) return;
      if (error instanceof ApiError && error.status === 401) {
        await this.clear("Your session ended. Please sign in again.");
        return;
      }
      throw error;
    }
  }
  async login(email: string, password: string) {
    const g = ++this.generation;
    this.schoolVersion++;
    this.update({
      status: "signedOut",
      identity: null,
      workspace: null,
      schoolId: "",
      busy: true,
      error: "",
      activity:
        "Connecting to your school. First connection can take up to 90 seconds.",
    });
    let issued = "";
    try {
      await this.api.prepare();
      if (g !== this.generation) return;
      this.update({ activity: "Signing in…" });
      const result = await this.api.login(email, password);
      issued = result.token;
      if (g !== this.generation) {
        await this.api.logout(issued).catch(() => {});
        return;
      }
      this.token = issued;
      await this.persist(() => this.vault.write(issued), g);
      if (g !== this.generation) return;
      await this.identify(g);
    } catch (error) {
      if (g !== this.generation) return;
      if (issued) {
        await this.api.logout(issued).catch(() => {});
        await this.clear(
          error instanceof Error ? error.message : "Sign in failed",
        );
      } else
        this.update({
          busy: false,
          activity: "",
          error: error instanceof Error ? error.message : "Sign in failed",
        });
    }
  }
  chooseAnotherSchool() {
    if (
      this.state.identity?.user.role !== "director" ||
      this.state.identity.schools.length < 2
    )
      return;
    this.schoolVersion++;
    this.update({
      schoolId: "",
      schoolChoiceRequired: true,
      workspace: null,
      busy: false,
      error: "",
    });
  }
  async selectSchool(id: string) {
    if (
      !this.state.identity?.schools.some((s) => s.id === id) ||
      this.state.identity.user.passwordChangeRequired
    )
      return;
    const v = ++this.schoolVersion,
      g = this.generation;
    this.update({ schoolId: id, workspace: null, busy: true, error: "" });
    try {
      const workspace = await this.api.workspace(this.token, id);
      if (g === this.generation && v === this.schoolVersion)
        this.update({ workspace, busy: false, schoolChoiceRequired: false });
    } catch (error) {
      if (g !== this.generation || v !== this.schoolVersion) return;
      if (error instanceof ApiError && error.status === 401) {
        await this.clear("Your session ended. Please sign in again.");
        return;
      }
      this.update({
        busy: false,
        error: error instanceof Error ? error.message : "Cannot load school",
      });
    }
  }
  private async clear(message = "") {
    const g = ++this.generation;
    this.schoolVersion++;
    this.token = "";
    this.update({
      status: "signedOut",
      identity: null,
      workspace: null,
      schoolId: "",
      busy: false,
      error: message,
      activity: "",
    });
    try {
      await this.persist(() => this.vault.clear(), g);
    } catch {
      if (g !== this.generation) return;
      this.update({
        status: "locked",
        error:
          "Secure storage could not be cleared. Retry sign out before leaving this device.",
      });
    }
  }
  async logout() {
    const token = this.token;
    const g = this.generation + 1;
    await this.clear();
    if (token)
      try {
        await this.api.logout(token);
      } catch {
        if (g === this.generation && this.state.status === "signedOut")
          this.update({
            error:
              "Signed out on this device. Server revocation could not be confirmed; use the website’s Security page to end this session.",
          });
      }
  }
  private async account<T>(action: (token: string) => Promise<T>): Promise<T> {
    if (
      this.state.status !== "ready" ||
      !this.token ||
      this.state.identity?.user.passwordChangeRequired
    )
      throw Error("Sign in and finish your password change first.");
    const scope = this.scope();
    try {
      const result = await action(this.token);
      if (scope !== this.scope())
        throw Error("Account context changed. Reopen this view.");
      return result;
    } catch (error) {
      if (
        scope === this.scope() &&
        error instanceof ApiError &&
        error.status === 401
      )
        await this.clear("Your session ended. Please sign in again.");
      throw error;
    }
  }
  activeSessions() {
    return this.account((token) => this.api.sessions(token));
  }
  revokeOtherSessions() {
    return this.account((token) => this.api.revokeOthers(token));
  }
  async changePassword(current: string, password: string) {
    if (password.length < 12 || password === current)
      throw Error("Choose a different password of at least 12 characters.");
    const g = this.generation;
    try {
      await this.api.changePassword(this.token, current, password);
    } catch (error) {
      if (
        g === this.generation &&
        error instanceof ApiError &&
        error.status === 401
      )
        await this.clear("Your session ended. Please sign in again.");
      throw error;
    }
    if (g === this.generation)
      await this.clear("Password changed. Sign in with your new password.");
  }
}

export function needsSchoolChoice(state: SessionState) {
  return (
    state.status === "ready" &&
    !state.identity?.user.passwordChangeRequired &&
    state.identity?.user.role === "director" &&
    state.schoolChoiceRequired
  );
}
