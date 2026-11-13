import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useLocales } from "expo-localization";
import { createContext, use, useEffect, useMemo, type ReactNode } from "react";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../state/preferences";
import { normalizeLanguage, resolveLocale, type LanguagePreference } from "./locale";
import { makeTranslator } from "./translator";
import { setNativeLocale, systemLocales } from "./nativeLocale";
interface LanguageContextValue {
  readonly language: LanguagePreference;
  readonly locale: "en" | "zh-CN";
  readonly isReady: boolean;
  readonly setLanguage: (language: LanguagePreference) => void;
  readonly t: ReturnType<typeof makeTranslator>;
}
const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { readonly children: ReactNode }) {
  const preferences = useAtomValue(mobilePreferencesAtom);
  const update = useAtomSet(updateMobilePreferencesAtom);
  const locales = useLocales();
  const isReady = AsyncResult.isSuccess(preferences);
  const language = normalizeLanguage(isReady ? preferences.value.language : undefined);
  const locale = resolveLocale(language, systemLocales(locales));
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- synchronizes Android and Clerk native resources with the persisted UI language
  useEffect(() => {
    if (!isReady) return;
    void setNativeLocale(locale).catch((error: unknown) => {
      console.error("Could not synchronize the native app language", error);
    });
  }, [isReady, locale]);
  const value = useMemo(
    () => ({
      language,
      locale,
      isReady,
      setLanguage: (language: LanguagePreference) => update({ language }),
      t: makeTranslator(locale),
    }),
    [language, locale, isReady, update],
  );
  return <LanguageContext value={value}>{children}</LanguageContext>;
}

export function useLanguage() {
  const value = use(LanguageContext);
  if (!value) throw new Error("LanguageProvider is missing");
  return value;
}
