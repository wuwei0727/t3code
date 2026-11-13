import { makeTranslator, type UiTranslator } from "../../i18n/translator";
import type { NativeReviewDiffRow } from "../diffs/nativeReviewDiffSurface";

const keys = [
  "reviewPresentation.changes",
  "reviewPresentation.uncommitted",
  "reviewPresentation.staged",
  "reviewPresentation.base",
  "reviewPresentation.nonText",
  "reviewPresentation.noPreview",
  "reviewPresentation.large",
  "reviewPresentation.largeDefault",
  "reviewPresentation.load",
  "reviewPresentation.sizeCap",
  "reviewPresentation.truncated",
  "reviewPresentation.unsupported",
  "reviewPresentation.parseFailed",
  "reviewPresentation.incomplete",
  "reviewPresentation.incompleteCounts",
  "reviewPresentation.tooLarge",
  "reviewPresentation.noContents",
  "reviewPresentation.rename",
  "reviewPresentation.oldNewEof",
  "reviewPresentation.newEof",
  "reviewPresentation.oldEof",
] as const;
const english = makeTranslator("en");
export function localizeReviewText(text: string, t: UiTranslator) {
  for (const key of keys) if (text === english(key)) return t(key);
  const turn = /^Turn (\d+)$/.exec(text);
  return turn ? t("reviewPresentation.turn", { count: turn[1]! }) : text;
}

export function localizeNativeReviewRows(rows: readonly NativeReviewDiffRow[], t: UiTranslator) {
  return rows.map((row) =>
    row.kind === "notice" && row.text ? { ...row, text: localizeReviewText(row.text, t) } : row,
  );
}
