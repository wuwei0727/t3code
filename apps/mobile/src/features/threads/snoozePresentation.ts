import type { SnoozePreset } from "@t3tools/client-runtime/state/thread-settled";
import { makeTranslator, type UiTranslator } from "../../i18n/translator";
const english = makeTranslator("en");
const dayKeys = [
  "snoozeUi.monday",
  "snoozeUi.tuesday",
  "snoozeUi.wednesday",
  "snoozeUi.thursday",
  "snoozeUi.friday",
  "snoozeUi.saturday",
  "snoozeUi.sunday",
] as const;
const namedKeys = [
  "snoozeUi.morning",
  "snoozeUi.afternoon",
  "snoozeUi.evening",
  "snoozeUi.tomorrow",
  "snoozeUi.week",
] as const;
export function localizeSnoozeWake(text: string, t: UiTranslator) {
  if (t("snoozeUi.now") === english("snoozeUi.now")) return text;
  if (text === "now") return t("snoozeUi.now");
  const value = /^(\d+)(m|h|d)$/.exec(text);
  return value
    ? t(
        value[2] === "m"
          ? "snoozeUi.minutes"
          : value[2] === "h"
            ? "snoozeUi.hours"
            : "snoozeUi.days",
        { count: value[1]! },
      )
    : text;
}
export function snoozePresetDisplay(preset: SnoozePreset, t: UiTranslator) {
  if (t("snoozeUi.now") === english("snoozeUi.now"))
    return { label: preset.label, whenLabel: preset.whenLabel };
  let label = preset.label;
  const duration = /^In (\d+) (minutes?|hours?|days?)$/.exec(label);
  if (duration)
    label = t(
      duration[2]!.startsWith("minute")
        ? "snoozeUi.inMinutes"
        : duration[2]!.startsWith("hour")
          ? "snoozeUi.inHours"
          : "snoozeUi.inDays",
      { count: duration[1]! },
    );
  else {
    for (const key of namedKeys) if (label === english(key)) label = t(key);
    for (const key of dayKeys) {
      if (label === english(key)) label = t(key);
      else if (label === `Next ${english(key)}`) label = t("snoozeUi.next", { day: t(key) });
    }
  }
  return {
    label,
    whenLabel: new Date(preset.snoozedUntil).toLocaleString("zh-CN", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}
