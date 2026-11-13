import type { UiLocale } from "../../i18n/locale";
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric" });
const DATE_WITH_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, {
  month: "numeric",
  day: "numeric",
  year: "numeric",
});

/** Time only for today's messages; older ones lead with the day and month. */
const LOCALE_FORMATTERS = Object.fromEntries(
  ["en", "zh-CN"].map((locale) => [
    locale,
    {
      time: new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        hour12: locale === "en",
      }),
      date: new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }),
      year: new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric", year: "numeric" }),
    },
  ]),
);

export function formatMessageTimestamp(
  input: string,
  nowMs: number = Date.now(),
  locale?: UiLocale,
): string {
  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) return "";
  const date = new Date(timestamp);
  const now = new Date(nowMs);
  const formatters = locale ? LOCALE_FORMATTERS[locale] : undefined;
  const time = (formatters?.time ?? TIME_FORMATTER).format(date);
  if (date.toDateString() === now.toDateString()) return time;
  const sameYear = date.getFullYear() === now.getFullYear();
  return `${(sameYear ? (formatters?.date ?? DATE_FORMATTER) : (formatters?.year ?? DATE_WITH_YEAR_FORMATTER)).format(date)} ${time}`;
}
