# Mobile pilot and release checklist

Updated 22 October 2026. See [MOBILE-PLAN.md](MOBILE-PLAN.md) for phase status and [MOBILE-WORKFLOWS.md](MOBILE-WORKFLOWS.md) for native versus website coverage. This document records work still required; unchecked rows are not claims of completed testing. Use dummy accounts/schools for acceptance and preserve existing school data.

## M4.1 — Account security acceptance

Implemented entry points: Profile → Active sessions and Services → Security → Active sessions. All roles can review their own active sign-ins. Entries show client-supplied device description, start/expiry and current-session marker. No other session token is returned. Device descriptions are not trusted proof of a particular physical device.

The first Sign out other sessions button opens a confirmation. Cancel leaves sign-ins untouched. Confirm revokes other sign-ins for the same account across all schools; the current sign-in remains. A confirmed result shows the server count and refreshes the list. After an uncertain network response, manually refresh before retrying. No automatic revocation retry or background polling is used. Changing the password still signs out all sessions through the existing backend.

| Check | Automated result | Phone result |
| --- | --- | --- |
| Current marker and account-only metadata | Local API integration covered | Pending |
| Second same-account sign-in revoked; current survives | Local API integration covered | Pending |
| Another user's sign-in unaffected | Local API integration covered | Pending |
| Cancel confirmation makes no revocation | Browser scenario covered | Pending |
| Expired token clears private session state | Unit coverage | Pending |
| Logout during pending read rejects late data | Unit coverage | Pending |
| Failed revocation is sent once | Unit coverage | Pending |
| Light/dark labels, scrolling and accessible controls | Browser checks | Pending |

Two-device walkthrough: sign in to a dummy account on the website and in Expo Go; open Active sessions in the app; verify Current sign-in; cancel once, then confirm. Try a protected read in the browser: it should request sign-in. The app should still refresh. Never use another person's live account or expose tokens while collecting feedback.

## M5.1 — Build preparation

- [x] Re-run the isolated mobile dependency audit and review the upstream findings recorded in apps/mobile/README.md. Do not use forced incompatible package overrides.
- [ ] Confirm Node/Expo SDK 57 compatibility, Android SDK/licenses, Java and actual adb/device connectivity. Earlier availability checks do not prove native build readiness.
- [x] Decide the first signed pilot target. Android preview APK is the initial route; iOS provisioning and release testing need their own supported setup.
- [x] Configure private signing credentials outside the repository. Expo-managed Android key created and reused; no key export. No keystore, password, API token, MySQL or R2 secret belongs in app.json, EXPO_PUBLIC variables or Git.
- [ ] Verify final app identity and original icon/splash assets for a custom binary; current Expo preview identity is not store-release acceptance.
- [ ] Run mobile typecheck, lint, tests and native JS exports. Then build/install an actual signed binary; JS export alone is not an APK/IPA.
- [x] Review any current free build quota before requesting a cloud build. Do not start paid services, store registration or publication automatically.

Local source verification from the repository root:

```powershell
npm --prefix apps/mobile ci
npm run mobile:check
```

Preview:

```powershell
npm --prefix apps/mobile start -- --clear
```

Use compatible Expo Go; sign in to the same free Expo account in CLI/phone when required. Rebuild a custom development client when native modules change. Do not expose Metro as a public always-on server. Full setup/troubleshooting: [apps/mobile/README.md](../apps/mobile/README.md).

## M5.2 — Physical-device matrix

Record device model, OS, Expo Go/custom build version, date, role, steps, expected/actual result and screenshot with dummy data. Mark Pass only after execution.

| Scenario | Android | iOS |
| --- | --- | --- |
| Sign in, readiness/cold start and clear failure message | Pending | Pending |
| Mandatory password change, reset disabled/delivery state | Pending | Pending |
| Multi-school director explicit choice and switching | Pending | Pending |
| Guardian child isolation and switching during requests, including calendar and report tables | Pending | Pending |
| Month navigation, holiday details/legend and multi-day ranges | Pending | Pending |
| Student/teacher report table and branded PDF save/share with configured sign-off names | Pending | Pending |
| Screen swipes, draggable glass indicator, active-tab hub return and service ownership | Pending | Pending |
| Background/resume, expired/revoked session, logout | Pending | Pending |
| Light/dark, native glass fallback, Reduce Transparency | Pending | Pending |
| Reduced Motion, screen transitions, loaders and interrupted saves | Pending | Pending |
| Large text, screen reader, landscape, keyboard/back and small screen | Pending | Pending |
| Student answer/file upload and private document sharing | Pending | Pending |
| Teacher class attendance (today/session, mark remaining present, exceptions, one review/save), marks/notices and no duplicate write | Pending | Pending |
| Native date selection/cancel, optional clear and local date around midnight | Pending | Pending |
| Leadership leave/correction decisions and fee recording | Pending | Pending |
| Account session list, cancel and other-session revocation | Pending | Pending |

Report failures in WORKLOG.md with reproduction and fix commit. Do not add student details or credentials. Passing browser checks cannot establish OS keychain, native picker/share-sheet behavior, frame rate or signed-build acceptance.

## M6 — Later extensions

Push: register/revoke device tokens securely, authorize account/school delivery, use minimal lock-screen payloads, test permission denial and logout. Define infrastructure and current cost limits first.

Offline: begin with an explicit privacy/cache policy and conflict model. No persistent private school cache or queued attendance/marks writes are currently enabled. Any write synchronization needs server versions, visible conflicts and user review.

Distribution: signed pilot approval precedes wider distribution. App-store accounts, publishing, notifications and production data testing remain separate decisions. The existing website/API remains the shared backend; no second database or hosting service is needed for this milestone.


M4.7 native navigation acceptance: reload the new route graph (restart Metro with --clear if needed). Test left/right tab swipes, distant tab taps, rapid reversal, dock drags, service Back, keyboard/vertical scrolling, Reduce Motion, and logout after browsing several services. Slides should move both pages together in tab order; they begin after swipe release. Confirm /login appears on logout and Back cannot restore a previous user's tab or form. Browser tests measure paired transforms, but do not establish phone frame-rate.


M5.1 preparation is recorded in [MOBILE-BUILD-GUIDE.md](MOBILE-BUILD-GUIDE.md). Original icons and an internal APK profile are configured. The 22 October audit still has 22 findings (19 high, 3 moderate); recording them does not resolve or waive them. Local SDK directories/Java/adb-file presence are checked. Expo-managed Android signing is configured; local license/device connectivity and native installation remain unchecked.


22 October approved continuation: mobile-only archive contains 70 files and passed path/content review as bounded checks. Owner approved source upload; Expo-managed Android signing is configured. First build failed at npm installation without consuming allowance (still 0/15, estimated charges zero); repaired optional lockfile records pass npm 10 Linux-targeted ci dry-run. Retry 5bc4f0eb-154f-4fb0-b497-59d8a324fed7 finished successfully. Artifact signature and identity verification passed; all physical-phone checks remain pending.


Signed Android pilot ready: [install/build page](https://expo.dev/accounts/jatinsinghrautela/projects/schoolglass-desk/builds/5bc4f0eb-154f-4fb0-b497-59d8a324fed7). APK 0.1.0/1 verified with apksigner; package/minimum/target metadata checked. Android usage is now 1/15 and estimated charges $0. Test on a physical Android phone with dummy accounts; record the result separately from build verification. All phone-result rows remain pending until actually tested.


### Login keyboard regression — replacement pilot

0.1.0/1 has an owner-reported Android keyboard overlap. Source fix 0.1.1/2 is prepared; replacement APK build awaits approval. After installing it, open/focus email then password, show/hide the password while the keyboard stays open, scroll to Sign in, dismiss/reopen the keyboard, rotate the phone and repeat in both themes/large text. Repeat with the mandatory three-password screen. Record actual phone results; browser short-viewport checks are not native keyboard acceptance.
