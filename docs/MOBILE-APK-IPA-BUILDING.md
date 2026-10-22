# Build Schoolglass Desk for Android and iOS

Maintainer guide · checked 22 October 2026. This file explains how a person with the codebase can build locally or through Expo EAS. It does not run a build, enroll in paid services, publish an app or grant access to the original owner's signing credentials.

The original Android cloud APK route has been exercised: 0.1.1, Android versionCode 2. Local Android, local EAS and every native iOS route below are instructions for future builders, not completed acceptance tests. Current pilot artifacts/history are in [MOBILE-BUILD-GUIDE.md](MOBILE-BUILD-GUIDE.md). Review [dependency findings](MOBILE-DEPENDENCY-REVIEW.md) and complete the [phone checklist](MOBILE-PILOT-CHECKLIST.md) before wider distribution.

## 1. Choose the output and route

| Route | Build computer | Output | Accounts and cost constraints |
| --- | --- | --- | --- |
| Android EAS cloud | Windows, macOS or Linux | Signed APK for direct installation | Expo account/project access; included allowance or paid usage |
| Android EAS local | macOS or Linux | Signed APK | Expo authentication/project access, Android toolchain locally; no cloud builder used |
| Android native local | Windows, macOS or Linux | APK, signed with your own key | Android SDK/NDK and Java; Expo account not required for compilation |
| iPhone EAS cloud | Windows, macOS or Linux | Device-signed IPA | Expo access and paid Apple Developer team for normal ad hoc/TestFlight distribution |
| iPhone EAS local | macOS only | Device-signed IPA | Xcode, CocoaPods, fastlane, Expo access and appropriate Apple signing |
| iPhone native local | macOS only | Personal-device app or archive/exported IPA | Free Personal Team for limited personal testing; paid team for distribution |
| iOS simulator, cloud/local | Cloud compilation can start from any OS; running requires a Mac | Simulator .app/archive | No paid Apple membership needed for simulator signing; cloud quota still applies |

An APK cannot install on iPhone. A simulator .app is not an iPhone IPA. An IPA is installable only under its Apple signing/provisioning/distribution rules; simply sending an unsigned IPA to a phone does not work. EAS cloud compilation does not require owning a Mac, but running Apple's simulator or compiling iOS locally does.

EAS local builds are officially supported on macOS/Linux. Windows/WSL is not an officially supported local EAS build environment; use Windows-native Gradle for Android, a Linux/macOS computer, or EAS cloud. [Expo local-build requirements](https://docs.expo.dev/build-reference/local-builds/).

## 2. Checkout and install the repository

Example Windows PowerShell, starting in a parent folder where you want the checkout:

```powershell
git clone https://github.com/jatinsinghrautela/School-Management.git
cd School-Management
npm ci
npm --prefix apps/mobile ci
npm run mobile:check
cd apps/mobile
npx expo install --check
npx expo-doctor
```

On macOS/Linux the same commands work from a shell. Use your actual checkout path. Root dependencies are needed for the mobile integration tests because they exercise the shared API against an in-memory synthetic store. You do not need Docker, MySQL, R2 credentials or a running production backend to compile the app. Do not seed/reset real databases as part of building.

Mobile dependencies have a separate package-lock.json and .npmrc (`workspaces=false`); do not remove the lockfile or merge this package into the root web/API workspace. Tested preparation used Node 24.11.1/npm 11.6.2 locally; the successful cloud SDK57 image used Node22.23.1/npm10. Check current SDK57/toolchain requirements before selecting a newer image. Keep the checked-in repaired lockfile: the original cloud failure was missing optional @emnapi entries under npm10, not missing school data. Do not use forced audit fixes to change Expo/RN major versions.

## 3. Configure identity and the backend

Review `apps/mobile/app.json`:

- `expo.version`: user-visible version, currently 0.1.1.
- `expo.android.versionCode`: integer update counter, currently 2; increment for the next Android binary.
- `expo.ios.buildNumber`: string counter, currently "1"; increment for each subsequent iOS upload/build as appropriate.
- `expo.android.package` and `expo.ios.bundleIdentifier`: currently com.jatinsinghrautela.schoolglass.
- `expo.owner` and `expo.extra.eas.projectId`: point to the original owner's Expo project.
- `expo.android.softwareKeyboardLayoutMode`: resize; retain the login keyboard avoidance code as well.

**Original app maintainer:** preserve package/bundle identity and signing keys for updates, and obtain authorized project/team access. **Independent fork:** use your own package/bundle IDs and Expo project. In your fork only, remove the old extra.eas.projectId, set/remove owner appropriately, then run `npx eas-cli@latest init` while signed into your account. Confirm `project:info` afterwards. Do not create a duplicate project for the original app or request the owner's private key just to test a fork. A new Android signing key cannot update the existing installed APK under the same identity.

The public API URL is bundled into the client. The current preview profile in `apps/mobile/eas.json` uses https://schoolglass.jatinsinghrautela.com. For your own deployment, change that public URL in the profile; for native local commands set it in your shell before compiling:

```powershell
# PowerShell, from apps/mobile
$env:EXPO_PUBLIC_API_URL = "https://your-api.example.com"
```

```bash
# macOS/Linux shell, from apps/mobile
export EXPO_PUBLIC_API_URL="https://your-api.example.com"
```

Replace the example with your actual reachable HTTPS server. Native Expo CLI/Gradle/Xcode commands do not automatically load the env block from eas.json. EAS builds use the selected profile. For original-app builds retain the approved live API URL. Never put MySQL, R2, SMTP, scanner, signing passwords or server tokens in EXPO_PUBLIC variables or mobile source. Do not copy the backend .env into the mobile package. A phone's localhost is the phone, not the developer's PC. Expo Go development against a LAN backend is a separate setup from a standalone HTTPS release.

Building packages JavaScript/assets; runtime accounts and school records come from the shared API after authentication. Testing writes against the live API really changes that data. Use dummy accounts.

## 4. Review before any EAS upload

From `apps/mobile`:

```powershell
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest project:info
npx eas-cli@latest account:usage YOUR_EXPO_ACCOUNT
npx eas-cli@latest build:inspect --platform android --stage archive --profile preview --output .pilot/review-unique-name
npm run pilot:archive:check -- .pilot/review-unique-name
```

Replace YOUR_EXPO_ACCOUNT and choose a fresh archive directory. Do not overwrite/delete an old evidence folder casually. For iOS review use `--platform ios`. This stages a local archive; it does not itself start the paid/included cloud build.

The root .easignore is essential: EAS stages the Git root, not just the mobile folder. Its allowlist contains mobile source/assets/config only; it excludes backend/web source, docs/tests, environment files, credentials, .pilot and signing material. Current source yields 71 files, but a future file count may legitimately differ. The checker validates paths/symlinks and expected config/lockfile; it does not search contents for secrets. Review configuration/content separately. If you add required files outside allowed paths, update the allowlist deliberately and inspect again.

Keep APKs/IPAs, raw logs, account exports and keystores out of Git. Use the already ignored apps/mobile/.pilot for artifacts and a secure external credential location. Secret visibility in EAS is not permission to bundle server secrets. Check the account's actual quota before every cloud build and stop if payment/upgrade would be needed. Historical usage is not a permanent free-build guarantee.

## 5. Android APK through Expo EAS cloud

The committed preview profile already selects internal distribution and `android.buildType: apk`.

1. Finish sections 2–4; confirm account access, target API URL and version counter.
2. Run from apps/mobile:

```powershell
npx eas-cli@latest build --platform android --profile preview
```

3. Original app: reuse existing Expo-managed Android credentials. New fork: let EAS create a new keystore for your app; preserve it securely for future updates. Do not rotate keys to fix a build failure.
4. Follow the build URL. For a detached launch add `--no-wait`; save its build ID and inspect the same job rather than creating duplicates:

```powershell
npx eas-cli@latest build:view BUILD_ID
```

5. On success download the APK from your own build page. Verify it using section 10. Open it on Android, temporarily permit installation from the browser/file app if requested, and tap Install/Update. Turn the source permission off afterwards if no longer needed.
6. A standalone preview does not need Metro, Expo Go or the build computer running. Internet/shared backend are still required. This does not submit to Google Play. AAB is for a separate store workflow, not direct installation. [Expo APK guide](https://docs.expo.dev/build-reference/apk/).

## 6. Android APK locally with EAS (Linux/macOS)

Install Node/npm, the SDK57-compatible JDK, Android SDK/NDK/build-tools and accept SDK licenses through Android Studio/SDK Manager. Check the exact NDK/build-tool versions requested by the generated SDK57 build; install those rather than assuming the platform SDK alone is enough. Set JAVA_HOME, ANDROID_HOME and platform-tools PATH to your real installations. Linux needs Linux tools; a Windows SDK directory is not a substitute inside WSL.

Complete Expo authentication/project/credential setup from sections 3–4, then from apps/mobile:

```bash
mkdir -p .pilot
npx eas-cli@latest build --platform android --profile preview --local --output .pilot/schoolglass-android-local.apk
```

Compilation happens locally, but EAS still checks the project and can download managed signing credentials. This is not an entirely offline/no-Expo route. If fully independent compilation is required, use section 7. The local command requires your local SDK/NDK/toolchain; cloud image/version selections and EAS Secret-visibility variables are not automatically reproduced locally. Supply needed local configuration yourself, without exposing credentials. No cloud builder allowance is consumed by local compilation. Verify the APK before installation.

## 7. Android APK locally with native tools (including Windows)

This route does not need an Expo cloud build/account. For an update to the original app, an authorized maintainer still needs its existing signing key. An independent fork should use its own identity/key.

1. Install Android Studio, JDK (the tested Android setup used Java17), SDK platform36/build-tools and the NDK requested by the generated build. Set the actual JAVA_HOME/ANDROID_HOME paths and install/accept required packages in SDK Manager. Confirm `java -version` and `adb version`.
2. Install repository/mobile dependencies and set EXPO_PUBLIC_API_URL in the same shell (section 3).
3. From apps/mobile, generate Android files with Expo, then build the release variant:

```powershell
npx expo prebuild --platform android
cd android
.\gradlew.bat :app:assembleRelease
cd ..
Get-ChildItem android/app/build/outputs/apk/release
```

On macOS/Linux, use `./gradlew :app:assembleRelease` inside android. Prebuild may update dependency metadata; review its diff. Do not use `--clean` against unreviewed native work. Generated android/ios directories are ignored: configure durable native changes with app.json/config plugins, never maintain hand-edited generated native files.

4. The release output is typically app-release.apk or app-release-unsigned.apk in that directory. **Release variant does not prove trusted signing:** generated templates can use a debug key. Do not distribute or install it over the existing app until you sign with the intended key and verify the certificate.
5. For a new independent app only, create a keystore outside the repository; keytool prompts for passwords:

```powershell
keytool -genkeypair -v -keystore "C:/PrivateSigning/schoolglass.jks" -alias schoolglass -keyalg RSA -keysize 2048 -validity 10000
```

Create/secure that external directory first. macOS/Linux use your own external path. Back up the key/passwords securely. For original-app updates, use the existing keystore instead; obtain it only through the authorized EAS credentials workflow (`npx eas-cli@latest credentials --platform android`), move exports out of the checkout immediately, and use its actual alias. Never print/share/commit the exported credentials.json.

6. Align, sign and verify with your installed build-tools. The example uses the tested Windows build-tools location; change it and the input filename/key path/alias to your setup:

```powershell
New-Item -ItemType Directory -Force .pilot
$buildToolsPath = "D:/Android/Sdk/build-tools/36.1.0"
& "$buildToolsPath/zipalign.exe" -P 16 -f 4 android/app/build/outputs/apk/release/app-release.apk .pilot/schoolglass-aligned.apk
& "$buildToolsPath/apksigner.bat" sign --ks "C:/PrivateSigning/schoolglass.jks" --ks-key-alias schoolglass --out .pilot/schoolglass-signed.apk .pilot/schoolglass-aligned.apk
& "$buildToolsPath/apksigner.bat" verify --verbose --print-certs .pilot/schoolglass-signed.apk
& "$buildToolsPath/zipalign.exe" -c -P 16 -v 4 .pilot/schoolglass-signed.apk
```

Use the unsigned filename if that is what Gradle produced. Let apksigner prompt for passwords; do not put them on the command line. On macOS/Linux use zipalign/apksigner without Windows extensions from your SDK build-tools directory. Alignment precedes signing; changing the APK afterwards invalidates its signature. Verify that any replaced/debug signature is now the intended certificate. [Android signing tool](https://developer.android.com/tools/apksigner), [alignment tool](https://developer.android.com/tools/zipalign).

7. Install through the file/browser method or, on an authorized USB-debugging phone, `adb install -r .pilot/schoolglass-signed.apk`. If Android reports incompatible signatures, do not uninstall just to bypass it: first compare signing keys/package IDs. Uninstalling removes local state; a separate fork identity is better for parallel independent testing.

## 8. iPhone IPA through Expo EAS cloud

Requires an authorized paid Apple Developer team for normal device distribution. Standard membership is US$99/year with regional pricing; an included Expo build does not cover Apple's membership. [Apple enrollment](https://developer.apple.com/help/account/membership/program-enrollment).

### A. Direct internal testing on registered phones

1. Complete repository setup and Expo project/privacy review. Confirm the Apple team can use the bundle ID in app.json; forks need their own ID.
2. Sign into the Apple account only in Expo's supported authentication prompts; do not send passwords/2FA codes to collaborators or add them to source.
3. Register each tester's device before building:

```powershell
npx eas-cli@latest device:create
```

Open the registration link on that iPhone and follow the instructions. Device identifiers are private operational metadata: do not commit them.
4. Build using the existing preview profile, which uses ad hoc provisioning for iOS:

```powershell
npx eas-cli@latest build --platform ios --profile preview
```

5. Follow the Apple team/certificate/provisioning prompts. The profile must include the intended devices. Download/install from the EAS internal installation page on the registered iPhone, and enable Developer Mode if the supported installation flow requires it. An IPA limited to registered devices is not a general public download. Adding a new phone requires updating provisioning/rebuilding or the supported re-sign workflow. Interactive first-time setup is safer than copying a non-interactive command with stale provisioning. [Expo internal distribution](https://docs.expo.dev/build/internal-distribution/).
6. Test authentication, keychain/session lifecycle, document sharing/pickers, safe areas, glass fallback/Reduce Transparency and gestures on the actual iPhone.

### B. TestFlight or App Store

This is a distinct store distribution build. The committed eas.json currently has only preview. In your working copy add a profile under build, retaining preview unchanged:

```json
"ios-store": {
  "extends": "preview",
  "distribution": "store"
}
```

Then build and, only when explicitly ready to upload to Apple, submit:

```powershell
npx eas-cli@latest build --platform ios --profile ios-store
npx eas-cli@latest submit --platform ios --id BUILD_ID
```

Create the matching App Store Connect app record, complete agreements and export-compliance questions, wait for processing, configure TestFlight testers and satisfy any applicable beta review. A successful submission is not an approved App Store release; publication requires the separate metadata/privacy/review process. Avoid auto-submit during a private build. [Expo iOS submission](https://docs.expo.dev/submit/ios/).

## 9. iOS locally, with or without EAS

### A. Local EAS IPA (Mac + paid team for distribution)

Install Xcode and its command-line tools, a supported iOS SDK/runtime, CocoaPods and fastlane plus Node/npm. Open Xcode once to finish component/license setup. Verify `xcodebuild -version`, `pod --version` and `fastlane --version`. Complete sections 2–4 and valid Apple signing/provisioning, then from apps/mobile:

```bash
mkdir -p .pilot
npx eas-cli@latest build --platform ios --profile preview --local --output .pilot/schoolglass-ios-local.ipa
```

For an authorized store IPA use ios-store instead. An ad hoc IPA and a store IPA are not interchangeable. EAS local still authenticates/checks the project and can download managed signing credentials. Follow the corresponding distribution installation rules from section 8. No cloud compilation allowance is consumed, but Apple signing requirements remain.

### B. Xcode directly (Mac; no EAS compilation)

1. Install Xcode/command-line tools and CocoaPods. Set the actual public HTTPS API URL in your shell and finish npm installation/checks.
2. From apps/mobile run `npx expo prebuild --platform ios` (includes native dependency installation). If pods are not installed, run `pod install` inside ios. Open the generated `.xcworkspace` in Xcode, not just the `.xcodeproj`.
3. Add your Apple account in Xcode Settings → Accounts. Choose the generated app target, correct bundle ID and Signing & Capabilities team, using automatic signing where appropriate. New/fork bundle IDs must be set in app.json before generation. Do not commit signing/provisioning/generated native files or manually maintain native source changes.
4. **Free Personal Team:** connect/trust your iPhone, enable Developer Mode if required, choose the physical device and Run. This is limited personal development, not a shareable distribution IPA. Free provisioning expires after seven days and needs rebuild/reinstall. [Apple free-account limits](https://developer.apple.com/help/account/basics/about-your-developer-account).
5. **Paid-team archive/export:** select the app's release scheme/configuration and a generic iOS device destination, then Product → Archive. In Organizer choose Distribute App; select the appropriate registered-device distribution/export or App Store Connect route for your team and current Xcode version. Follow signing/provisioning prompts and export the IPA to an external/ignored artifact directory. Preserve/export its matching dSYM symbols privately for crash investigation.
6. Install a device-exported IPA using the supported Xcode/Configurator or internal distribution flow on allowed devices. For TestFlight, upload the store archive and finish the App Store Connect steps. Verify with a real device; an archive succeeding does not establish working keychain, keyboard, PDF sharing or navigation.

Windows/Linux cannot compile an iOS app locally with Xcode. A Mac with free signing is a personal test option, not a replacement for normal paid distribution. [Expo local release guide](https://docs.expo.dev/guides/local-app-production/).

### C. iOS simulator build (not an IPA for a phone)

Add this optional profile under build in your own eas.json, keeping preview unchanged:

```json
"ios-simulator": {
  "extends": "preview",
  "ios": { "simulator": true }
}
```

Cloud build, then install/run on a Mac with a compatible Xcode simulator:

```bash
npx eas-cli@latest build --platform ios --profile ios-simulator
npx eas-cli@latest build:run --platform ios --id BUILD_ID
```

Or compile locally on a Mac with `npx expo run:ios` for development (usually Metro-dependent), or `npx expo run:ios --configuration Release` for the release variant with the public API environment set. EAS local simulator compilation also works on a properly configured Mac using the simulator profile and `--local`. Simulator artifacts do not need device provisioning, but cannot install on your iPhone; EAS cloud still consumes its applicable allowance. [Expo simulator guide](https://docs.expo.dev/build-reference/simulators/).

## 10. Verify, update, stop and troubleshoot

For every artifact record source commit/dirty changes, tool versions, profile, API origin, app/version/build identity, build ID (if EAS), checksum and public certificate fingerprint. Never publish private keys/passwords in this record.

- Android: use apksigner verification and `aapt dump badging PATH_TO_APK`; compare signer/package with the previous app before updating. Verify version counters and native architectures. For iOS, check bundle/build version, team, profile expiry and allowed devices in Xcode/Organizer/provisioning review.
- SHA-256: PowerShell `Get-FileHash PATH_TO_ARTIFACT -Algorithm SHA256`; macOS `shasum -a 256 PATH_TO_ARTIFACT`; Linux `sha256sum PATH_TO_ARTIFACT`. Checksums prove file identity, not complete app security.
- Test with dummy accounts: login keyboard/reveal button; theme/scroll contrast; cancel/confirm sign-out; class/school isolation; background/resume; file sharing; app update. A JS export is not a native build and a native build is not device acceptance.
- New updates: increment app.json version plus Android versionCode and/or iOS buildNumber, preserve identity/keys, recheck and build again. package.json's npm package version does not control these platform counters. Render deploys web/API only; it cannot update installed apps. No OTA update service is configured here.
- Stop local Metro/Gradle/EAS processes with Ctrl+C. Cancel a cloud job in its EAS build page; inspect quota afterwards, because cancellation is not a guaranteed refund. Keep logs locally but redact environment values/credentials before sharing.
- Android SDK/NDK/Java errors: inspect the first real Gradle failure, install the requested compatible toolchain and licenses, then retry once corrected. Do not repeatedly request cloud builds without changing the cause.
- Android signature mismatch: recover the intended key or use a separate fork ID. Keystore loss can prevent updates; secure backups matter. Do not regenerate the original key casually.
- iOS signing failure: confirm paid-team status where needed, bundle ID ownership, certificate/profile expiry and device registration. Simulator and device profiles cannot substitute for each other.
- Network timeout: ensure the phone can reach the configured API's `/api/ready`; a sleeping free backend may need time to wake. Do not copy server credentials into the app to fix connectivity.
- New build inputs outside src/assets/config: review root .easignore and archive checker before upload. Local EAS credential exports and generated files must stay private/ignored even if a tool produces them automatically.

## 11. What exists in this repository today

Only the preview EAS profile is currently committed. ios-store and ios-simulator above are optional examples to merge under build when needed; neither is enabled by this guide. No local signing key or Apple credentials are supplied. The original Expo project ID is public configuration, not authorization to access its account. Android 0.1.1/2 cloud build/signature are verified; native iOS remains unbuilt, and full phone acceptance remains pending. All routes reuse the existing shared backend.
