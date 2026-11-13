import type { ThreadId, WorktreeSetupSnapshot, WorktreeSetupStage } from "@t3tools/contracts";
import type { UiTranslator } from "../../i18n/translator";

export function worktreeSetupStagePresentation(stage: WorktreeSetupStage, t: UiTranslator) {
  return {
    detail:
      stage.status === "pending"
        ? null
        : stage.status === "skipped"
          ? (stage.detail ?? t("worktreeSetupUi.skipped"))
          : stage.id === "checkout" && stage.status === "running" && stage.percent !== null
            ? `${stage.percent}%`
            : stage.detail,
    showElapsed: stage.status !== "pending" && stage.status !== "skipped",
  };
}

/** A subscription can close or replay an older value during the setup handoff. */
export function resolveWorktreeSetupSnapshot(
  threadId: ThreadId | null,
  latest: WorktreeSetupSnapshot | null | undefined,
  held: WorktreeSetupSnapshot | null,
): WorktreeSetupSnapshot | null {
  const current = latest?.threadId === threadId ? latest : null;
  const previous = held?.threadId === threadId ? held : null;
  return current && (!previous || current.sequence >= previous.sequence) ? current : previous;
}
