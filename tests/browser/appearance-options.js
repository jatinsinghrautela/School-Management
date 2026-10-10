// Firefox's page-level emulation can be lost on isolated-document navigation.
// Set its native system preference too; do not weaken the application's headers
// or replace matchMedia. Live media changes are still exercised by the tests.
export const appearanceOptions = (colorScheme) => ({
  colorScheme,
  launchOptions: {
    firefoxUserPrefs: {
      "ui.systemUsesDarkTheme": colorScheme === "dark" ? 1 : 0,
    },
  },
});
