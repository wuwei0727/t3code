import {
  connectionStatusText,
  type EnvironmentConnectionPresentation,
} from "@t3tools/client-runtime/connection";
import type { UiLocale } from "../../i18n/locale";
import { makeTranslator } from "../../i18n/translator";

export function environmentStatusText(
  connection: EnvironmentConnectionPresentation,
  locale: UiLocale = "en",
): string {
  if (locale === "zh-CN") {
    const t = makeTranslator(locale);
    switch (connection.phase) {
      case "available":
        return t("connection.row.available");
      case "offline":
        return t("connection.row.offline");
      case "connecting":
        return t("connection.row.connecting");
      case "connected":
        return t("connection.row.connected");
      case "reconnecting":
        return connection.error
          ? t("connection.row.reconnectError", { error: connection.error })
          : t("connection.row.reconnecting");
      case "unsupported":
        return connection.error ?? t("connection.row.unsupported");
      case "error":
        return connection.error
          ? t("connection.row.failureReason", { error: connection.error })
          : t("connection.row.failed");
    }
  }
  return connection.phase === "unsupported" && connection.error !== null
    ? connection.error
    : connectionStatusText(connection);
}
