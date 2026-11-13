import type { UiTranslator } from "../../i18n/translator";

const keys = {
  "Provider updated.": "providerMaintenanceUi.updated",
  "Already up to date.": "providerMaintenanceUi.current",
  "Waiting for another provider update to finish.": "providerMaintenanceUi.queued",
  "Checking for the latest version": "providerMaintenanceUi.checking",
  "Verifying the installed version": "providerMaintenanceUi.verifying",
  "Provider installation changed. Refresh and try again.": "providerMaintenanceUi.changed",
  "This version is no longer recommended or this installer cannot install a specific version. Refresh provider settings.":
    "providerMaintenanceUi.targetUnavailable",
  "The latest provider version is incompatible with this T3 Code release. Review provider settings.":
    "providerMaintenanceUi.incompatible",
  "Update command completed, but T3 Code could not verify the provider version.":
    "providerMaintenanceUi.unverified",
  "Update command completed, but T3 Code still detects an outdated provider version.":
    "providerMaintenanceUi.stillOutdated",
  "OpenCode CLI updated. Restart the configured local OpenCode server to use the new version.":
    "providerMaintenanceUi.openCodeRestart",
} as const;

export function providerMaintenanceMessage(message: string, t: UiTranslator): string {
  return Object.hasOwn(keys, message) ? t(keys[message as keyof typeof keys]) : message;
}
