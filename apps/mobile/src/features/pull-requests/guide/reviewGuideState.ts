import { makeTranslator, type UiTranslator } from "../../../i18n/translator";
import type { PullRequestReviewGuideResult } from "@t3tools/contracts";

export function reviewGuideState(data: PullRequestReviewGuideResult | null) {
  const guide = data?.guide ?? null;
  return {
    guide,
    running: data?.run?._tag === "Running",
    stale: guide !== null && data?.currentHeadSha != null && guide.headSha !== data.currentHeadSha,
    failure:
      data?.run?._tag === "Failed" && data.run.headSha === data.currentHeadSha
        ? data.run.detail
        : null,
  };
}

export function guideNoticeState(
  state: {
    readonly data: PullRequestReviewGuideResult | null;
    readonly isPending: boolean;
    readonly running: boolean;
    readonly startError: string | null;
    readonly error: string | null;
  },
  t: UiTranslator = makeTranslator("en"),
) {
  const { guide, stale, failure } = reviewGuideState(state.data);
  if (state.running) {
    return {
      kind: "writing" as const,
      title: t("guideState.rewriting"),
      description: guide ? t("guideState.keep") : t("guideState.writingDetail"),
      action: guide ? t("guideState.rewriteBusy") : t("guideState.writing"),
    };
  }
  const error = state.startError ?? failure;
  if (error) {
    return {
      kind: "failed" as const,
      title: t("guideState.failed"),
      description: error,
      action: t("guideState.retry"),
    };
  }
  if (state.error) {
    return {
      kind: "unavailable" as const,
      title: t("guideState.refreshFailed"),
      description: state.error,
      action: t("guideState.retry"),
    };
  }
  if (!state.data) {
    return {
      kind: "loading" as const,
      title: t("guideState.title"),
      description: t("guideState.checking"),
      action: t("guideState.loading"),
    };
  }
  if (stale) {
    return {
      kind: "stale" as const,
      title: t("guideState.new"),
      description: t("guideState.stale"),
      action: t("guideState.rewrite"),
    };
  }
  return {
    kind: guide ? ("ready" as const) : ("empty" as const),
    title: t("guideState.title"),
    description: t("guideState.detail"),
    action: t("guideState.write"),
  };
}
