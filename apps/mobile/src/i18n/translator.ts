import { createTranslator, type UiLocale } from "./locale";
import messages from "./messages.generated.json";

export const makeTranslator = (locale: UiLocale) =>
  createTranslator(locale, messages.en, messages.zhCN);

export type UiTranslator = ReturnType<typeof makeTranslator>;
