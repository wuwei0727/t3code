import type { UiTranslator } from "../i18n/translator";
import { providerOptionKeys } from "./providerOptionUiCatalog";

export function localizeProviderOptionText(text: string, t: UiTranslator): string {
  const parts = text.split(" · ");
  if (parts.length > 1) return parts.map((part) => localizeProviderOptionText(part, t)).join(" · ");
  return Object.hasOwn(providerOptionKeys, text)
    ? t(providerOptionKeys[text as keyof typeof providerOptionKeys])
    : text;
}
