import { useLanguage } from "../i18n/LanguageProvider";
import type { UiLocale } from "../i18n/locale";
import { useAtomValue } from "@effect/atom-react";
import { Atom } from "effect/reactivity";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { Platform } from "react-native";
import { useAppearancePreferences } from "../features/settings/appearance/AppearancePreferencesProvider";
import { environmentCatalog } from "../connection/catalog";
import { environmentPresentations } from "../state/presentation";
import { publishSubscriptionUsage } from "./publishSubscriptionUsage";
import { buildSubscriptionUsageSnapshot } from "./subscriptionUsageSnapshot";
import { createWidgetTheme } from "./widgetTheme";

// Isolate quota changes from the much busier thread/config presentation stream.
const snapshotAtom = Atom.family((locale: UiLocale) =>
  Atom.make((get) =>
    buildSubscriptionUsageSnapshot(
      get(environmentPresentations.presentationsWithProvidersAtom),
      Linking.createURL("settings/usage", { queryParams: { tab: "limits" } }),
      Platform.OS === "android" ? Infinity : 6,
      locale,
    ),
  ).pipe(Atom.withEquality((a, b) => JSON.stringify(a) === JSON.stringify(b))),
);

export function SubscriptionUsageCoordinator() {
  const { t, locale } = useLanguage();
  const {
    themeMode,
    themeAppearance,
    themeVariablesByAppearance,
    isReady: appearanceReady,
  } = useAppearancePreferences();
  const catalog = useAtomValue(environmentCatalog.catalogValueAtom);
  const snapshot = useAtomValue(snapshotAtom(locale));
  const androidAppearance = Platform.OS === "android" ? themeAppearance : null;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- publishes subscription usage and theme to the native home screen widget
  useEffect(() => {
    if (!catalog.isReady || !appearanceReady) return;
    void Promise.resolve()
      .then(() =>
        publishSubscriptionUsage({
          ...snapshot,
          locale,
          labels: {
            connect: t("usageWidget.connect"),
            refresh: t("usageWidget.refresh"),
            left: t("usageWidget.left"),
            more: t("usageWidget.more"),
            asOf: t("usageWidget.asOf"),
            tap: t("usageWidget.tap"),
          },
          theme: createWidgetTheme(themeMode, themeVariablesByAppearance),
        }),
      )
      .catch((error: unknown) => {
        console.warn("Could not update subscription usage widget", error);
      });
  }, [
    t,
    locale,
    catalog.isReady,
    appearanceReady,
    snapshot,
    themeMode,
    themeVariablesByAppearance,
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- Android stores resolved colors; System appearance changes must republish them.
    androidAppearance,
  ]);
  return null;
}
