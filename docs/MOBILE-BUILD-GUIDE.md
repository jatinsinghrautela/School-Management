# Schoolglass Desk — Android pilot build guide

Updated 22 October 2026. The owner approved a private Android build after confidentiality review. The mobile-only archive was uploaded to Expo EAS; build 5bc4f0eb-154f-4fb0-b497-59d8a324fed7 is in progress. No installation, phone acceptance or store release is claimed. Preserve all school data. Test with dummy accounts: a standalone app uses the same live API and its writes are real.

## Current readiness

- SDK-compatible Expo patch updates applied; original 1024 px launcher/adaptive icons generated locally from the existing geometric Schoolglass mark.
- `apps/mobile/eas.json` has one `preview` profile: internally distributed, standalone Android APK, approved HTTPS API, no development client/Metro dependency.
- Java 17, Android platforms 34/35/36, build tools and adb files exist on this PC. This does not establish accepted licenses, a working Gradle build or a connected/authorized phone.
- Expo project linked: @jatinsinghrautela/schoolglass-desk, ID eef665c0-7729-4f71-89f2-99daf806fa68. EAS usage checked 22 October: Free plan, Android builds 0/15 used in the current cycle, no estimated charges. Re-check before submission. Expo-managed Android signing credentials were created for the first attempt and reused for the retry; no private key was exported. Build completion, installation and phone acceptance remain pending.
- Audit on 22 October: **22 findings: 19 high, 3 moderate**. They include Expo/Metro/React Native dependency chains; they are package findings, not 22 independent confirmed exploits. Do not assume they are all harmless or all present in the runtime bundle. Review before distribution; do not run `npm audit fix --force`, which proposes incompatible downgrades.

## 1. Verify source and local configuration

From the repository root:

```powershell
npm --prefix apps/mobile ci
npm run mobile:check
npm --prefix apps/mobile run pilot:preflight -- --audit --save
```

The report is saved to ignored `apps/mobile/.pilot/preflight.json`. It contains counts/configuration/tooling status, not passwords or tokens. Default mode reports remaining manual gates; `--strict` fails while any gate remains. Do not interpret a normal exit as signed-build acceptance. Running the preflight never starts adb, accepts licenses, installs an APK, calls the school API or creates a cloud build.

From `apps/mobile`:

```powershell
npx expo install --check
npx expo-doctor
npx expo export --platform android --platform ios --platform web
```

Bundle export verifies JavaScript/asset packaging, not a native binary. Android Studio SDK Manager must confirm the SDK/NDK/licenses required by the actual generated build; the preflight's file-presence checks do not approve licenses on your behalf.

## 2. Link the Expo project and review the Free allowance

Use your existing free Expo account; never send its password/token in chat.

```powershell
cd "D:\Personal Projects\School Management\apps\mobile"
npx expo whoami
npx eas-cli@latest init
```

Select/create the project for Schoolglass Desk under your own account. Review changes to app.json: EAS adds a real `extra.eas.projectId`. The repository now contains the real project ID above; do not create a duplicate project. Commit that non-secret ID after checking the account/project. Re-run the preflight to confirm the ID is present, then verify the actual project/account with `npx eas-cli@latest project:info`. The local preflight cannot prove that a project ID exists remotely. Do not add database, R2 or school credentials to Expo settings.

Before starting a build, check your account dashboard's current Free allowance and billing settings. A free account does not imply unlimited builds. Stop if the quota is exhausted or an upgrade/payment is requested. No billing plan or build job is enabled by repository configuration alone.

## 3. Review the archive and public build settings

The preview profile explicitly uses `https://schoolglass.jatinsinghrautela.com`. Every `EXPO_PUBLIC_*` value is bundled into the app and visible to recipients. Only the API URL is approved. Review EAS preview-environment variables for accidental overrides; do not put server secrets there. Android application ID is `com.jatinsinghrautela.schoolglass`.

Before uploading, inspect a fresh build archive and run its local checker:

```powershell
npx eas-cli@latest build:inspect --platform android --stage archive --profile preview --output .pilot/<new-archive-name>
npm run pilot:archive:check -- .pilot/<new-archive-name>
```

These commands create/check a local copy, not a cloud build. The final 22 October mobile-only archive has 70 files and zero flagged paths. Use a new output directory; do not force-delete an old one casually. Repository-root .easignore is required because EAS stages the Git root, not just apps/mobile. It now allowlists only mobile source/assets and the explicit mobile build inputs. Backend/web source, documentation, tests, environment examples, local evidence and signing material are excluded. The checker rejects all other paths and links, but is not a content-based secret scanner. A separate local content review found no matches for the known local secret values or checked private-key/token patterns in the mobile archive; this is bounded verification, not a universal guarantee. Review new configuration values before each upload.

Ensure ignored `.env`, API data/uploads, `.pilot`, signing files and credentials are absent. Do not attach that archive to GitHub or chat. The checked-in .gitignore files exclude local data, native generated directories and private signing material; review ignores again if new secret filenames are introduced.

Review the original icon on a round/squircle Android launcher and on iOS. Regenerate with `node apps/mobile/scripts/generate-brand-assets.mjs` from the repository root. These are original code-drawn assets, not downloaded artwork; store branding acceptance remains a manual step.

## 4. Build an internal Android APK

Proceed only after reviewing the dependency findings and current account allowance. From `apps/mobile`:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

Follow private signing prompts. If this is the first build, EAS may offer to generate a keystore. Keep the same signing key for future updates. Back up credentials securely through the supported EAS credentials workflow; never commit/download them into tracked paths. `credentials.json`, `*.jks`, `*.keystore` and `signing/` are ignored, but an ignore rule is not secure storage.

The profile builds an APK rather than a Play Store AAB, and does not submit to any store. A build may fail; inspect its logs without exposing environment values. Do not retry repeatedly without fixing the cause and checking remaining quota. Download only the artifact from your own build dashboard. A completed build is still not a passed device pilot.

## 5. Install and test

Transfer/download the APK to your Android phone. If Android requests permission to install from that browser/file app, enable it only as needed for your own trusted artifact, then turn it off again. Open Schoolglass Desk. A standalone preview bundles JavaScript and does not need Metro or this PC running; the phone needs internet to reach the shared backend.

Use dummy students/teachers/principals. Run [MOBILE-PILOT-CHECKLIST.md](MOBILE-PILOT-CHECKLIST.md), recording model, OS, build version and actual results. Include school/child isolation, mandatory password change, session revocation, background/resume, cold starts, PDF sharing/uploads, picker cancel, tab swipes, keyboard and accessibility. Do not mark browser checks as phone results.

Keep iPhone testing in compatible Expo Go for now. An Android APK cannot install on iOS. iOS simulator builds require a Mac to run; physical-device signed distribution needs its supported provisioning route. Do not buy an Apple/store membership as part of this zero-investment preparation.

## 6. Update, stop and recover

- Mobile code changes are not deployed by Render. Render deploys the shared web/API; a standalone APK needs a new compatible build/install. No over-the-air update service is configured.
- Before a new APK, increment app.json's `version` and Android `versionCode`, preserve the package ID/signing key, run checks and review API backward compatibility. Current version/code: 0.1.0/1. iOS buildNumber is 1 as preparation only.
- Stop a queued/running EAS build in your project dashboard using its cancel action. Canceling does not promise that consumed allowance is refunded; check account usage. Removing an installed test app does not cancel cloud jobs.
- Stop Metro with Ctrl+C; no standalone build depends on it. Remove the test APK through Android settings when finished. Uninstalling removes local app state; revoke its school session through Active sessions if needed.
- If a key is lost, recover your secure backup/EAS-managed signing credentials. A different key cannot seamlessly update the existing installation. Never rotate production keys casually.
- For a failed build, retain sanitized logs and source commit; fix the cause before retrying. For a failed phone workflow, record steps and dummy-data screenshots before changing code. Existing school data must not be reset.

## Reference sources

[Expo APK profiles](https://docs.expo.dev/build-reference/apk/), [EAS configuration](https://docs.expo.dev/build/eas-json/), [internal distribution](https://docs.expo.dev/build/internal-distribution/), [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/). Account quotas and platform requirements can change; verify them before requesting a build.


## Current build record

The owner explicitly approved source upload provided confidential data was excluded. A whole-repository archive was rejected during local review and was never uploaded; the root allowlist was tightened to 70 mobile-only files. No school records, API environment files, MySQL/R2 credentials or signing keys were uploaded in the source archive. A full cloud-environment export was blocked by automatic approval review and skipped; no secret values were retrieved. The build CLI reported no preview Plain text/Sensitive environment variables; only the profile's public API URL was loaded.

First job [3b9543f2](https://expo.dev/accounts/jatinsinghrautela/projects/schoolglass-desk/builds/3b9543f2-b1b0-4499-ad73-ac497dfb6406) failed during npm installation: the lockfile omitted optional @emnapi/core/runtime 1.11.3 records. Reproduced with npm 10, repaired in a clean isolated folder, and verified using npm 10 Linux-targeted ci dry-run. No existing dependency version or application behavior changed. EAS usage after this early failure remained Android 0/15 with estimated charges zero.

Retry [5bc4f0eb](https://expo.dev/accounts/jatinsinghrautela/projects/schoolglass-desk/builds/5bc4f0eb-154f-4fb0-b497-59d8a324fed7) uses the repaired lockfile and the same Expo-managed signing key. Its archive passed the mobile-only path check; compared with the content-reviewed archive, only public npm lockfile metadata changed. Build is currently in progress. Do not start a duplicate job; inspect this job's status/logs first. APK verification, installation and physical-device acceptance remain pending. No paid upgrade, store submission or school-data mutation was performed. Public distribution remains gated by [dependency review](MOBILE-DEPENDENCY-REVIEW.md).
