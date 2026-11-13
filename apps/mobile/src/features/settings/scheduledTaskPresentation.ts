const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatScheduledTaskInterval(everyMs: number, locale: UiLocale = "en"): string {
  const t = makeTranslator(locale);
  const units = [
    [7 * DAY, "week"],
    [DAY, "day"],
    [HOUR, "hour"],
    [MINUTE, "minute"],
    [1_000, "second"],
    [1, "millisecond"],
  ] as const;
  let remaining = everyMs;
  const parts: string[] = [];
  for (const [size, unit] of units) {
    const count = Math.floor(remaining / size);
    if (count === 0) continue;
    if (count === 1 && remaining === everyMs && remaining === size)
      return t("scheduledTasks.everySingle", { unit: t(`scheduledTasks.units.${unit}`) });
    parts.push(
      t("scheduledTasks.unitCount", {
        count,
        unit: t(`scheduledTasks.units.${unit}${count === 1 ? "" : "s"}`),
      }),
    );
    remaining %= size;
  }
  return t("scheduledTasks.everyCompound", { parts: parts.join(" ") });
}

function localCalendarDay(date: Date): number {
  // Compare calendar days, not 24-hour spans: DST days can have 23 or 25 hours.
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY;
}

export function formatNextScheduledTaskRun(
  nextRunAt: string,
  now: number,
  locale: UiLocale = "en",
): string {
  const t = makeTranslator(locale);
  const next = new Date(nextRunAt);
  const current = new Date(now);
  const remaining = next.getTime() - now;
  if (!Number.isFinite(remaining)) return t("scheduledTasks.nextUnavailable");
  if (remaining <= 0) return t("scheduledTasks.nextDue");

  const days = localCalendarDay(next) - localCalendarDay(current);
  if (days === 0) {
    if (remaining < MINUTE) return t("scheduledTasks.nextSoon");
    const unit = remaining < HOUR ? "minute" : "hour";
    const count = Math.round(remaining / (remaining < HOUR ? MINUTE : HOUR));
    return t("scheduledTasks.nextIn", {
      count,
      unit: t(`scheduledTasks.units.${unit}${count === 1 ? "" : "s"}`),
    });
  }

  const time = next.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  if (days === 1) return t("scheduledTasks.nextTomorrow", { time });
  if (days <= 7) {
    return t("scheduledTasks.nextWeekday", {
      weekday: next.toLocaleDateString(locale, { weekday: "long" }),
      time,
    });
  }
  const date = next.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    ...(next.getFullYear() !== current.getFullYear() ? { year: "numeric" as const } : {}),
  });
  return t("scheduledTasks.nextDate", { date, time });
}
import type { UiLocale } from "../../i18n/locale";
import { makeTranslator } from "../../i18n/translator";
