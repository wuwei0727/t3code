import { requireOptionalNativeModule } from "expo";

import type { UiLocale } from "./locale";

const nativeLocale = requireOptionalNativeModule<{
  getSystemLocaleTags: () => string;
  setLocale: (locale: UiLocale) => Promise<void>;
}>("T3AppLocale");

export function systemLocales(fallback: readonly { readonly languageTag: string }[]) {
  return nativeLocale
    ? nativeLocale
        .getSystemLocaleTags()
        .split(",")
        .filter(Boolean)
        .map((languageTag) => ({ languageTag }))
    : fallback;
}

export async function setNativeLocale(locale: UiLocale) {
  await nativeLocale?.setLocale(locale);
}
