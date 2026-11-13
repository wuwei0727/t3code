import type { UiLocale } from "../../i18n/locale";
import { makeTranslator } from "../../i18n/translator";
import type { PreviewSessionSnapshot } from "@t3tools/contracts";

export function latestBrowserTab(tabs: ReadonlyArray<PreviewSessionSnapshot>) {
  return tabs.reduce<PreviewSessionSnapshot | null>(
    (latest, tab) => (latest === null || tab.updatedAt > latest.updatedAt ? tab : latest),
    null,
  );
}

export function browserTabUrl(tab: PreviewSessionSnapshot) {
  return tab.navStatus._tag === "Idle" ? "" : tab.navStatus.url;
}

export function browserTabTitle(tab: PreviewSessionSnapshot, locale: UiLocale = "en") {
  if (tab.navStatus._tag === "Idle") return makeTranslator(locale)("browserPreview.newTab");
  if (tab.navStatus.title.trim()) return tab.navStatus.title;
  try {
    return new URL(tab.navStatus.url).host || tab.navStatus.url;
  } catch {
    return tab.navStatus.url;
  }
}
