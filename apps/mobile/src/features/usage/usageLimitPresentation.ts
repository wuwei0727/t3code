import { formatResetsIn } from "@t3tools/shared/usageLimits";
import type { ServerProviderUsageWindow } from "@t3tools/contracts";
import { makeTranslator, type UiTranslator } from "../../i18n/translator";
import { usageWindowKeys } from "./usageWindowCatalog";
const keys = [
  "usagePresentation.now",
  "usagePresentation.moment",
  "usagePresentation.noSubscription",
  "usagePresentation.failed",
  "usagePresentation.none",
  "usagePresentation.overall",
  "usagePresentation.overallDetail",
  "usagePresentation.cursor",
  "usagePresentation.cursorDetail",
  "usagePresentation.other",
  "usagePresentation.otherDetail",
  "usagePresentation.noCredits",
  "usagePresentation.use",
  "usagePresentation.reset",
  "usagePresentation.confirmation",
] as const;
const english = makeTranslator("en");
export function localizeUsageText(text: string, t: UiTranslator): string {
  if (t("usagePresentation.now") === english("usagePresentation.now")) return text;
  const hours = /^(\d+) hours?$/.exec(text);
  if (hours) return t("usageWindowUi.hours", { count: hours[1]! });
  if (Object.hasOwn(usageWindowKeys, text))
    return t(usageWindowKeys[text as keyof typeof usageWindowKeys]);
  const parts = text.split(" · ");
  if (
    parts.length === 2 &&
    parts.some((part) => Object.hasOwn(usageWindowKeys, part)) &&
    !/\d+ left/.test(text)
  )
    return parts.map((part) => localizeUsageText(part, t)).join(" · ");
  const detail = text.split(": ");
  if (detail.length === 2 && Object.hasOwn(usageWindowKeys, detail[0]!))
    return `${localizeUsageText(detail[0]!, t)}：${localizeUsageText(detail[1]!, t)}`;
  for (const key of keys) if (text === english(key)) return t(key);
  const resets = /^resets in (.+)$/.exec(text);
  if (resets) return t("usagePresentation.in", { duration: resets[1]! });
  const nextExpiry = /^(.+) · next expires in (.+)$/.exec(text);
  if (nextExpiry)
    return t("usagePresentation.nextExpires", {
      detail: localizeUsageText(nextExpiry[1]!, t),
      duration: nextExpiry[2]!,
    });
  const expiry = /^(.+) · expires in (.+)$/.exec(text);
  if (expiry)
    return t("usagePresentation.expires", {
      detail: localizeUsageText(expiry[1]!, t),
      duration: expiry[2]!,
    });
  const banked = /^(\d+) reset credits? banked$/.exec(text);
  if (banked) return t("usagePresentation.banked", { count: banked[1]! });
  const option = /^(.+) · (\d+) left$/.exec(text);
  if (option)
    return t("usagePresentation.option", {
      label: localizeUsageText(option[1]!, t),
      count: option[2]!,
    });
  const warning = /^(.*) This cannot be undone\.$/.exec(text);
  return warning
    ? t("usagePresentation.undo", { detail: localizeUsageText(warning[1]!, t) })
    : text;
}
export function localizedResetsIn(window: ServerProviderUsageWindow, now: number, t: UiTranslator) {
  const value = formatResetsIn(window, now);
  return value === null ? null : localizeUsageText(value, t);
}
