import { makeTranslator } from "../../i18n/translator";
import type { UiLocale } from "../../i18n/locale";
import type {
  PullRequestActivity,
  PullRequestCheck,
  PullRequestChecksState,
  PullRequestDetail,
  PullRequestListEntry,
  PullRequestMergeability,
} from "@t3tools/contracts";
import type { AppSymbolName } from "../../components/ui/AppSymbol";
import { PullRequestGlyph } from "./pullRequestGlyphs";

const STATES = {
  open: {
    label: "Open",
    icon: PullRequestGlyph.pullRequest,
    tint: "accent-adaptive-emerald-600-400",
    text: "text-adaptive-emerald-600-400",
    background: "bg-adaptive-emerald-500-a12-a16",
  },
  merged: {
    label: "Merged",
    icon: PullRequestGlyph.merged,
    tint: "accent-adaptive-violet-600-400",
    text: "text-adaptive-violet-600-400",
    background: "bg-adaptive-violet-500-a12-a16",
  },
  closed: {
    label: "Closed",
    icon: PullRequestGlyph.closed,
    tint: "accent-danger-foreground",
    text: "text-danger-foreground",
    background: "bg-danger",
  },
  draft: {
    label: "Draft",
    icon: PullRequestGlyph.draft,
    tint: "accent-icon-muted",
    text: "text-foreground-muted",
    background: "bg-grouped-card",
  },
} satisfies Record<
  string,
  { label: string; icon: AppSymbolName; tint: string; text: string; background: string }
>;

export function pullRequestStatus(
  pr: Pick<PullRequestListEntry, "state" | "isDraft">,
  locale: UiLocale = "en",
) {
  const key = pr.isDraft && pr.state === "open" ? "draft" : pr.state;
  return { ...STATES[key], label: makeTranslator(locale)(`prStatus.state.${key}`) };
}

export function pullRequestConflict(
  pr: {
    readonly state: PullRequestListEntry["state"];
    readonly isDraft: boolean;
    readonly mergeability?: PullRequestMergeability | undefined;
    readonly baseBranch?: string | undefined;
  },
  locale: UiLocale = "en",
) {
  const t = makeTranslator(locale);
  if (pr.state !== "open" || pr.isDraft || pr.mergeability !== "conflicting") return null;
  return {
    label: pr.baseBranch
      ? t("prStatus.conflictsWith", { branch: pr.baseBranch })
      : t("prStatus.hasConflicts"),
  };
}

export function checkStatus(check: PullRequestCheck, locale: UiLocale = "en") {
  const t = makeTranslator(locale);
  switch (check.status) {
    case "success":
      return {
        label: t("prStatus.passed"),
        icon: "checkmark.circle",
        tint: "accent-adaptive-emerald-600-400",
      } as const;
    case "failure":
      return {
        label: t("prStatus.failed"),
        icon: "exclamationmark.circle",
        tint: "accent-danger-foreground",
      } as const;
    case "action-required":
      return {
        label: t("prStatus.required"),
        icon: "exclamationmark.circle",
        tint: "accent-warning-foreground",
      } as const;
    case "pending":
      return {
        label: t("prStatus.pending"),
        icon: "clock",
        tint: "accent-warning-foreground",
      } as const;
    case "cancelled":
      return { label: t("prStatus.cancelled"), icon: "minus", tint: "accent-icon-muted" } as const;
    case "skipped":
      return {
        label: t("prStatus.skipped"),
        icon: "slash.circle",
        tint: "accent-icon-muted",
      } as const;
    case "neutral":
      return { label: t("prStatus.neutral"), icon: "minus", tint: "accent-icon-muted" } as const;
  }
}

export function pullRequestChecksSummary(
  pr: Pick<PullRequestDetail, "checks">,
  locale: UiLocale = "en",
) {
  const t = makeTranslator(locale);
  const failed = pr.checks.filter((check) => check.status === "failure").length;
  const required = pr.checks.filter((check) => check.status === "action-required").length;
  const pending = pr.checks.filter((check) => check.status === "pending").length;
  const passed = pr.checks.filter((check) => check.status === "success").length;
  const count = pr.checks.length
    ? t("prStatus.count", { passed, total: pr.checks.length })
    : undefined;
  if (failed)
    return {
      label: t(failed === 1 ? "prStatus.failingOne" : "prStatus.failingMany", { count: failed }),
      title: t(failed === 1 ? "prStatus.failingOne" : "prStatus.failingMany", { count: failed }),
      count,
      icon: "exclamationmark.circle",
      tint: "accent-danger-foreground",
    } as const;
  if (required)
    return {
      label: t("prStatus.attentionCount", { count: required }),
      title: t("prStatus.needAttention"),
      count: t("prStatus.awaitingCount", { count: required }),
      icon: "exclamationmark.circle",
      tint: "accent-warning-foreground",
    } as const;
  if (pending)
    return {
      label: t("prStatus.pendingCount", { count: pending }),
      title: t("prStatus.running"),
      count: t("prStatus.pendingCount", { count: pending }),
      icon: "clock",
      tint: "accent-warning-foreground",
    } as const;
  if (passed)
    return {
      label: t("prStatus.passedCount", { passed, total: pr.checks.length }),
      title: passed === pr.checks.length ? t("prStatus.allPassed") : t("prStatus.completed"),
      count,
      icon: "checkmark.circle",
      tint: "accent-adaptive-emerald-600-400",
    } as const;
  return {
    label: pr.checks.length
      ? t("prStatus.completedCount", { count: pr.checks.length })
      : t("prStatus.noChecks"),
    title: pr.checks.length ? t("prStatus.completed") : t("prStatus.noChecks"),
    count,
    icon: "minus",
    tint: "accent-icon-muted",
  } as const;
}

// GitHub and Forgejo send uppercase review states; Bitbucket and GitCafe send lowercase.
export function normalizedReviewState(reviewState: string | null) {
  return reviewState?.toUpperCase().replaceAll("-", "_");
}

export function pullRequestReviewSummary(
  pr: Pick<PullRequestDetail, "reviewers">,
  activity: Pick<PullRequestActivity, "comments" | "commits"> | null,
  locale: UiLocale = "en",
) {
  const t = makeTranslator(locale);
  const latest = new Map<string, PullRequestActivity["comments"][number]>();
  const comments = new Map<string, PullRequestActivity["comments"][number]>();
  for (const review of activity?.comments ?? []) {
    const state = normalizedReviewState(review.reviewState);
    if (review.kind !== "review" || !state) continue;
    const key = review.author?.login ?? review.id;
    if (state === "COMMENTED") {
      const previous = comments.get(key);
      if (!previous || Date.parse(review.createdAt) >= Date.parse(previous.createdAt))
        comments.set(key, { ...review, reviewState: state });
      continue;
    }
    if (!["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(state)) continue;
    const previous = latest.get(key);
    if (!previous || Date.parse(review.createdAt) >= Date.parse(previous.createdAt))
      latest.set(key, { ...review, reviewState: state });
  }
  const reviews = [
    ...[...latest.values()].filter((review) => review.reviewState !== "DISMISSED"),
    ...[...comments.entries()].filter(([key]) => !latest.has(key)).map(([, review]) => review),
  ];
  const requested = reviews.filter((review) => review.reviewState === "CHANGES_REQUESTED");
  const newestCommit = Math.max(
    0,
    ...(activity?.commits.map((commit) => Date.parse(commit.committedDate)) ?? []),
  );
  const approved = reviews.filter(
    (review) => review.reviewState === "APPROVED" && Date.parse(review.createdAt) >= newestCommit,
  );
  if (requested.length)
    return {
      title: t("prStatus.changes"),
      count: t(requested.length === 1 ? "prStatus.reviewerOne" : "prStatus.reviewerMany", {
        count: requested.length,
      }),
      icon: "xmark.circle.fill",
      tint: "accent-danger-foreground",
      reviews,
    } as const;
  if (approved.length)
    return {
      title:
        approved.length === 1 && approved[0]?.author
          ? t("prStatus.approvedBy", { login: approved[0].author.login })
          : t("prStatus.approved"),
      count: t("prStatus.approvedCount", { count: approved.length }),
      icon: "checkmark.circle",
      tint: "accent-adaptive-emerald-600-400",
      reviews,
    } as const;
  const commented = reviews.filter((review) => review.reviewState === "COMMENTED");
  if (commented.length && !pr.reviewers.length)
    return {
      title: t("prStatus.reviews"),
      count: t("prStatus.commentedCount", { count: commented.length }),
      icon: "bubble.left",
      tint: "accent-icon-muted",
      reviews,
    } as const;
  return {
    title: pr.reviewers.length ? t("prStatus.awaiting") : t("prStatus.request"),
    count: pr.reviewers.length
      ? t("prStatus.requestedCount", { count: pr.reviewers.length })
      : t("prStatus.none"),
    icon: "person.2",
    tint: "accent-icon-muted",
    reviews,
  } as const;
}

export function pullRequestBranchSummary(
  pr: Pick<PullRequestDetail, "mergeability" | "baseComparison" | "behindBy" | "baseBranch">,
  locale: UiLocale = "en",
) {
  const t = makeTranslator(locale);
  if (pr.mergeability === "conflicting") return t("prStatus.hasConflicts");
  if (pr.baseComparison === "behind")
    return t("prStatus.behind", { count: pr.behindBy ?? "", branch: pr.baseBranch }).trim();
  if (pr.baseComparison === "up-to-date") return t("prStatus.upToDate");
  return pr.mergeability === "mergeable" ? t("prStatus.noConflicts") : t("prStatus.notReported");
}

export function pullRequestChecksStatus(state: PullRequestChecksState) {
  if (state === "passing")
    return { icon: "checkmark.circle", tint: "accent-adaptive-emerald-600-400" } as const;
  if (state === "failing")
    return { icon: "xmark.circle.fill", tint: "accent-danger-foreground" } as const;
  return { icon: "clock", tint: "accent-warning-foreground" } as const;
}
