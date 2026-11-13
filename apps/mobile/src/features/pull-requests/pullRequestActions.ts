import { makeTranslator } from "../../i18n/translator";
import type { UiLocale } from "../../i18n/locale";
import { localizeChangeRequestTerminology } from "./changeRequestTerminology";
import {
  sourceControlClients,
  type ChangeRequestTerminology,
} from "@t3tools/client-runtime/source-control-clients";
import type {
  PullRequestAction,
  PullRequestDetail,
  PullRequestMergeMethod,
  SourceControlProviderKind,
} from "@t3tools/contracts";
import type { AppSymbolName } from "../../components/ui/AppSymbol";
import { PullRequestGlyph } from "./pullRequestGlyphs";

type ActionDetail = Pick<
  PullRequestDetail,
  "state" | "isDraft" | "mergeability" | "autoMergeEnabled" | "workflowApprovalsRequired"
> & {
  readonly capabilities: Pick<
    PullRequestDetail["capabilities"],
    "actions" | "mergeMethods" | "updateMethods" | "deleteBranch"
  >;
  readonly viewerPermissions: Pick<
    PullRequestDetail["viewerPermissions"],
    "actions" | "updateMethods"
  >;
  readonly mergeCapabilities: PullRequestDetail["mergeCapabilities"];
};

export const MERGE_METHODS = {
  squash: { title: "Squash and merge", description: "Combine the commits into one commit." },
  merge: {
    title: "Create a merge commit",
    description: "Keep the commits and add a merge commit.",
  },
  rebase: { title: "Rebase and merge", description: "Add the commits without a merge commit." },
} as const satisfies Record<PullRequestMergeMethod, { title: string; description: string }>;

export function pullRequestActionLabel(
  action: PullRequestAction,
  terminology: ChangeRequestTerminology,
  locale: UiLocale = "en",
): string {
  const t = makeTranslator(locale);
  const request = localizeChangeRequestTerminology(terminology, locale).singular;
  switch (action) {
    case "merge":
      return t("prActions.merge", { request });
    case "ready":
      return t("prActions.ready");
    case "draft":
      return t("prActions.draft");
    case "close":
      return t("prActions.close", { request });
    case "reopen":
      return t("prActions.reopen", { request });
    case "update-branch":
      return t("prActions.updateBranch");
    case "enable-auto-merge":
      return t("prActions.enableAuto");
    case "disable-auto-merge":
      return t("prActions.disableAuto");
    case "revert":
      return t("prActions.revert", { request });
    case "delete-branch":
      return t("prActions.deleteBranch");
    case "approve-workflows":
      return t("prActions.approveWorkflows");
  }
}

export const PR_ACTION_ICONS = {
  merge: PullRequestGlyph.merged,
  ready: "checkmark.circle",
  draft: "pencil",
  close: "xmark",
  reopen: "arrow.clockwise",
  "update-branch": "arrow.up.circle",
  "enable-auto-merge": "clock",
  "disable-auto-merge": "xmark",
  revert: "arrow.uturn.backward",
  "delete-branch": "trash",
  "approve-workflows": "checkmark",
} as const satisfies Record<PullRequestAction, AppSymbolName>;

export function allowedMergeMethods(pr: ActionDetail) {
  return pr.capabilities.mergeMethods.filter((method) => pr.mergeCapabilities[method]);
}

export function allowedUpdateMethods(pr: ActionDetail) {
  return (pr.capabilities.updateMethods ?? []).filter((method) =>
    pr.viewerPermissions.updateMethods?.includes(method),
  );
}

export function canPerformPullRequestAction(pr: ActionDetail, action: PullRequestAction) {
  if (!pr.capabilities.actions.includes(action) || !pr.viewerPermissions.actions.includes(action))
    return false;
  if (action === "reopen") return pr.state === "closed";
  if (action === "revert") return pr.state === "merged";
  if (action === "delete-branch")
    return pr.state !== "open" && pr.capabilities.deleteBranch === true;
  if (pr.state !== "open") return false;
  switch (action) {
    case "update-branch":
      return allowedUpdateMethods(pr).length > 0;
    case "approve-workflows":
      return (pr.workflowApprovalsRequired ?? 0) > 0;
    case "ready":
      return pr.isDraft;
    case "draft":
      return !pr.isDraft;
    case "merge":
      return !pr.isDraft && pr.mergeability !== "conflicting" && allowedMergeMethods(pr).length > 0;
    case "enable-auto-merge":
      return !pr.isDraft && pr.autoMergeEnabled === false && allowedMergeMethods(pr).length > 0;
    case "disable-auto-merge":
      return pr.autoMergeEnabled === true;
    default:
      return true;
  }
}

export function mergeUnavailableReason(
  pr: ActionDetail,
  connectionAllowsWrites: boolean,
  terminology: ChangeRequestTerminology,
  locale: UiLocale = "en",
) {
  const t = makeTranslator(locale);
  const request = localizeChangeRequestTerminology(terminology, locale).singular;
  if (pr.state === "merged") return t("prActions.merged", { request });
  if (pr.state === "closed") return t("prActions.reopenFirst", { request });
  if (!connectionAllowsWrites) return t("prActions.readOnly");
  if (!pr.capabilities.actions.includes("merge")) return t("prActions.unsupported");
  if (!pr.viewerPermissions.actions.includes("merge")) return t("prActions.denied", { request });
  if (pr.isDraft) return t("prActions.readyFirst");
  if (pr.mergeability === "conflicting") return t("prActions.conflicts");
  if (!allowedMergeMethods(pr).length) return t("prActions.noMethods");
  return null;
}

export const openOnProviderLabel = (provider: SourceControlProviderKind, locale: UiLocale = "en") =>
  makeTranslator(locale)("prActions.openProvider", {
    provider: sourceControlClients.get(provider).label,
  });

export function mergeMethodPresentation(method: PullRequestMergeMethod, locale: UiLocale = "en") {
  const t = makeTranslator(locale);
  return {
    title: t(`prMerge.method.${method}.title`),
    description: t(`prMerge.method.${method}.description`),
  };
}
