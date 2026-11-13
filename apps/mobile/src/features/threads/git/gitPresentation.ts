import type { UiLocale } from "../../../i18n/locale";
import { makeTranslator } from "../../../i18n/translator";

const keys = [
  "gitProgress.source",
  "gitProgress.view",
  "gitProgress.refresh",
  "gitProgress.failed",
  "gitProgress.switch",
  "gitProgress.branch",
  "gitProgress.worktree",
  "gitProgress.pull",
  "gitProgress.upToDate",
  "gitProgress.action",
  "gitProgress.commit",
  "gitProgress.push",
  "gitProgress.generate",
  "gitProgress.createPr",
  "gitPresentation.commit",
  "gitPresentation.push",
  "gitPresentation.pull",
  "gitPresentation.view",
  "gitPresentation.create",
  "gitPresentation.commitPush",
  "gitPresentation.commitPushPr",
  "gitPresentation.pushPr",
  "gitPresentation.sync",
  "gitPresentation.busy",
  "gitPresentation.unavailable",
  "gitPresentation.cleanCommit",
  "gitPresentation.commitUnavailable",
  "gitPresentation.detachedPush",
  "gitPresentation.commitFirst",
  "gitPresentation.behindPush",
  "gitPresentation.originPush",
  "gitPresentation.noCommits",
  "gitPresentation.pushUnavailable",
  "gitPresentation.viewUnavailable",
  "gitPresentation.createUnavailable",
  "gitPresentation.detachedPr",
  "gitPresentation.originPr",
  "gitPresentation.noPrCommits",
  "gitPresentation.behindPr",
  "gitPresentation.checkoutFirst",
  "gitPresentation.originFirst",
  "gitPresentation.diverged",
  "gitPresentation.upToDate",
  "gitPresentation.checking",
  "gitPresentation.notRepo",
  "gitPresentation.loadingBranch",
  "gitPresentation.notGit",
  "gitPresentation.clean",
  "gitPresentation.changedOne",
  "gitPresentation.changedMany",
  "gitPresentation.changed",
  "gitPresentation.ahead",
  "gitPresentation.behind",
  "gitPresentation.commitAheadOne",
  "gitPresentation.commitAheadMany",
  "gitPresentation.behindUpstreamOne",
  "gitPresentation.behindUpstreamMany",
  "gitPresentation.openPr",
  "gitPresentation.prState",
] as const;
const english = makeTranslator("en");

export function localizeGitUiText(
  text: string,
  locale: UiLocale,
  parameters: Readonly<Record<string, string | number>> = {},
): string {
  if (locale === "en") return text;
  const key = keys.find((key) => english(key, parameters) === text);
  const localizedParameters = {
    ...parameters,
    ...(typeof parameters.article === "string"
      ? { article: parameters.article.replace(/^(?:a|an) /, "") }
      : {}),
  };
  return key ? makeTranslator(locale)(key, localizedParameters) : text;
}
