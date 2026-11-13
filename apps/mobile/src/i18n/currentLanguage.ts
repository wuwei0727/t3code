import { AsyncResult } from "effect/reactivity";
import { getLocales } from "expo-localization";

import { appAtomRegistry } from "../state/atom-registry";
import { mobilePreferencesAtom } from "../state/preferences";
import { resolveLocale } from "./locale";
import { systemLocales } from "./nativeLocale";
import { makeTranslator } from "./translator";

export function currentTranslator() {
  const preferences = appAtomRegistry.get(mobilePreferencesAtom);
  return makeTranslator(
    resolveLocale(
      AsyncResult.isSuccess(preferences) ? preferences.value.language : undefined,
      systemLocales(getLocales()),
    ),
  );
}
