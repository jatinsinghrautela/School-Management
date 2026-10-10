# Browser regression checks

The free, pinned Playwright runner tests the built React application served by the Node API, using a separate in-memory demo server on port 4100. It refuses to reuse another server. Tests use only seeded synthetic accounts; they do not connect to MySQL or change the workspace preview on port 5173. SMTP and upload scanning are explicitly disabled in the test server.

Install dependencies with `npm ci`, install the local browser with `npx playwright install chromium`, then run `npm run test:e2e`. The command builds the web app before starting the isolated server. GitHub Actions installs Chromium and runs the same suite alongside API tests. No hosted testing service or subscription is required. GitHub runner usage remains subject to the repository account's allowance.

Coverage includes built-app script errors, desktop logout visibility at 1280 × 800, mobile menu/logout and horizontal overflow at 390 × 844, dialog focus entry/wrapping/Escape/restoration and scroll locking, assigned-school switching, teacher notice targeting, disabled resource uploads and student read-only actions.

Five additional accessibility tests use the pinned free axe-core checker with WCAG 2 A/AA and 2.1 A/AA rule tags. They scan desktop/mobile login, owner/principal/teacher/student dashboards, school-role notice screens and principal/teacher publishing dialogs. Scans fail on any detected violation; rules are not excluded to hide failures. Automated checks cannot establish complete WCAG conformance.

Failure traces are saved under ignored `test-results/`. Open a specific trace with `npx playwright show-trace <trace.zip>`. Keep these checks synthetic; traces can contain page content and must not be collected against real student records.

This suite complements API and isolated MySQL checks. It is a Chromium regression baseline, not a complete accessibility audit, cross-browser certification or production deployment acceptance. Screen-reader review, further contrast coverage, additional viewport/content combinations and actual HTTPS proxy testing remain release work.

Two theme tests verify the default system setting, live OS preference changes, persistent explicit overrides and automated dark-mode contrast checks on login, the principal dashboard and publishing dialog. Theme preferences are local browser settings, independent of account credentials.
