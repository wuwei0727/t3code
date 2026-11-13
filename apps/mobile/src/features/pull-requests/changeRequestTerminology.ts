import type { ChangeRequestTerminology } from "@t3tools/client-runtime/source-control-clients";
import type { UiLocale } from "../../i18n/locale";
import { makeTranslator } from "../../i18n/translator";

export function localizeChangeRequestTerminology(
  term: ChangeRequestTerminology,
  locale: UiLocale,
): ChangeRequestTerminology {
  if (locale === "en") return term;
  const t = makeTranslator(locale);
  const singular =
    term.singular === "pull request"
      ? t("prTerminology.pull")
      : term.singular === "merge request"
        ? t("prTerminology.merge")
        : term.singular === "change request"
          ? t("prTerminology.change")
          : term.singular;
  return {
    ...term,
    singular,
    plural: singular,
    shortLabel: term.shortLabel === "change request" ? singular : term.shortLabel,
    shortLabelWithArticle: term.shortLabel === "change request" ? singular : term.shortLabel,
  };
}
