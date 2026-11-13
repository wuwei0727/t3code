import type { UiLocale } from "../i18n/locale";
import { makeTranslator } from "../i18n/translator";
export function relativeTime(
  input: string,
  nowMs: number = Date.now(),
  locale: UiLocale = "en",
): string {
  const t = makeTranslator(locale);
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) {
    return t("time.lessMinute");
  }

  const deltaSeconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));
  if (deltaSeconds < 60) return t("time.lessMinute");

  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return t("time.minutes", { count: deltaMinutes });

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return t("time.hours", { count: deltaHours });

  const deltaDays = Math.floor(deltaHours / 24);
  return t("time.days", { count: deltaDays });
}

/** Milliseconds until the relative-time label next changes. */
export function msUntilRelativeTimeChange(
  input: string,
  nowMs: number = Date.now(),
): number | null {
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) return null;
  const elapsedMs = Math.max(0, nowMs - timestamp);
  const unitMs = elapsedMs < 3_600_000 ? 60_000 : elapsedMs < 86_400_000 ? 3_600_000 : 86_400_000;
  const nextChangeMs = timestamp + (Math.floor(elapsedMs / unitMs) + 1) * unitMs;
  // Far-future timestamps must not overflow setTimeout's signed 32-bit delay.
  return Math.min(nextChangeMs - nowMs, 86_400_000);
}
