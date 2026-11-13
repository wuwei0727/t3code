import {
  AUTH_SCOPE_OPTIONS,
  sessionPermissionsUnavailableMessage,
} from "@t3tools/shared/authScopeOptions";
import { connectionRouteLabel, type ConnectionRoute } from "@t3tools/client-runtime/connection";
import { makeTranslator } from "../../i18n/translator";
import type { UiLocale } from "../../i18n/locale";

const english = makeTranslator("en");
const scopeKeys = [
  "view",
  "operate",
  "settings",
  "providers",
  "maintain",
  "preview",
  "diagnostics",
  "terminalRead",
  "terminalOperate",
  "sourceControl",
  "filesRead",
  "filesWrite",
  "accessRead",
  "accessWrite",
  "relayRead",
  "relayWrite",
] as const;

export function localizedAuthScopeOptions(locale: UiLocale) {
  const t = makeTranslator(locale);
  return AUTH_SCOPE_OPTIONS.map((option) => {
    const key = scopeKeys.find(
      (key) =>
        english(`permissionScope.${key}.title`) === option.title &&
        english(`permissionScope.${key}.description`) === option.description,
    );
    return key
      ? {
          ...option,
          title: t(`permissionScope.${key}.title`),
          description: t(`permissionScope.${key}.description`),
        }
      : option;
  });
}

export function sessionPermissionsText(
  locale: UiLocale,
  input: Parameters<typeof sessionPermissionsUnavailableMessage>[0],
) {
  const message = sessionPermissionsUnavailableMessage(input);
  const key = (
    [
      "connectionPermissions.connect",
      "connectionPermissions.rejected",
      "connectionPermissions.failed",
      "connectionPermissions.checking",
    ] as const
  ).find((key) => english(key) === message);
  return key ? makeTranslator(locale)(key) : message;
}

export function localizedConnectionRouteLabel(route: ConnectionRoute, locale: UiLocale) {
  const label = connectionRouteLabel(route);
  const key = (
    [
      "connectionPermissions.thisDevice",
      "connectionPermissions.lan",
      "connectionPermissions.remote",
    ] as const
  ).find((key) => english(key) === label);
  return key ? makeTranslator(locale)(key) : label;
}
