import { makeTranslator, type UiTranslator } from "../../i18n/translator";
import type { MenuAction } from "@react-native-menu/menu";

export function buildThreadTitleRegenerationMenuItems(input: {
  readonly t?: UiTranslator;
  readonly supported: boolean;
  readonly isRegenerating: boolean;
}): MenuAction[] {
  const t = input.t ?? makeTranslator("en");
  if (!input.supported) return [];

  return [
    {
      id: "regenerate-title",
      title: input.isRegenerating ? t("threadList.regenerating") : t("threadList.regenerate"),
      image: "arrow.clockwise",
      ...(input.isRegenerating ? { attributes: { disabled: true } } : {}),
    },
  ];
}
