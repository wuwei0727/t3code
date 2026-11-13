import type { UiLocale } from "./locale";

export const systemLocales = (locales: readonly { readonly languageTag: string }[]) => locales;

export async function setNativeLocale(_locale: UiLocale) {}
