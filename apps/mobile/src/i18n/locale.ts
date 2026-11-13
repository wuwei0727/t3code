export type LanguagePreference = "system" | "en" | "zh-CN";
export type UiLocale = Exclude<LanguagePreference, "system">;

export function normalizeLanguage(value: unknown): LanguagePreference {
  return value === "en" || value === "zh-CN" ? value : "system";
}

export function resolveLocale(
  preference: unknown,
  locales: readonly { readonly languageTag: string }[],
): UiLocale {
  const choice = normalizeLanguage(preference);
  if (choice !== "system") return choice;
  for (const { languageTag } of locales) {
    const parts = languageTag.toLowerCase().split(/[-_]/);
    if (parts[0] === "en") return "en";
    if (parts[0] !== "zh") continue;
    const extension = parts.findIndex((part, index) => index > 0 && part.length === 1);
    const core = parts.slice(1, extension < 0 ? undefined : extension);
    const script = core.find((part) => /^[a-z]{4}$/.test(part));
    const region = core.find((part) => /^[a-z]{2}$/.test(part));
    if (script === "hans" || (!script && !["tw", "hk", "mo"].includes(region ?? ""))) {
      return "zh-CN";
    }
  }
  return "en";
}

export function createTranslator<English extends Record<string, string>>(
  locale: UiLocale,
  english: English,
  chinese: Partial<Record<keyof English, string>>,
) {
  return (key: keyof English, parameters?: Readonly<Record<string, string | number>>) => {
    const text = (locale === "zh-CN" ? chinese[key] : undefined) ?? english[key];
    return text.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, (token, name: string) =>
      parameters?.[name] === undefined ? token : String(parameters[name]),
    );
  };
}
