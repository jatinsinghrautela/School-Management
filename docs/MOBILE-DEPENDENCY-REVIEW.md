# Mobile dependency review — 22 October 2026

This is a scoped review, not a security certification or a waiver. Latest audit: 22 affected-package findings (19 high, 3 moderate) trace to three advisory roots. The full machine report remains ignored in apps/mobile/.pilot/audit-full.json. Public distribution remains gated; a private pilot build is not release approval.

| Root dependency | Installed / chain | Current assessment |
| --- | --- | --- |
| braces | 3.0.3 via Expo Metro → metro-file-map → micromatch | Registry latest checked: 3.0.3. Advisory affects nested pattern handling; no newer fixed release was available. The observed chain is build tooling. Keep builds on trusted source; do not conclude runtime absence solely from the package tree. |
| node-forge | 1.4.0 via Expo CLI/code-signing certificates | Registry latest checked: 1.4.0. Signature-verification advisory remains unresolved upstream. Do not add custom certificate verification or claim the finding is harmless. This is separate from proving an Android APK's actual signature. |
| decode-uri-component | 0.2.2 via Expo Router → query-string 7.1.3 | Patched 0.5.0 exists, but it is ESM-only; installed query-string uses CommonJS require and expects a callable result. A forced override is not a verified compatible fix. Router/deep-link parsing needs upstream resolution or a separately tested adaptation before public distribution. |

Do not apply npm audit's suggested major Expo/React Native downgrades or silence findings with an audit exception. No dependency override, private fork or warning suppression was introduced in this review. Existing compatible SDK 57 patch versions remain installed.

A dummy-account pilot should exercise only trusted navigation and controlled data; it does not prove resilience against malicious links or untrusted build inputs. Do not broadly share a pilot artifact or advertise the app as security-approved. Re-check upstream fixes and npm audit before each later build.

Sources: [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv). Installed dependency paths and registry metadata were checked locally with npm; availability can change.
