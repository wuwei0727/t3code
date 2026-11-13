import { localizeChangeRequestTerminology } from "./changeRequestTerminology";
import { useLanguage } from "../../i18n/LanguageProvider";
import * as Dialog from "../../components/ui/Dialog";
import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import type { PullRequestDetail, PullRequestMergeMethod } from "@t3tools/contracts";
import { AsyncResult } from "effect/reactivity";
import { useRef, useState } from "react";
import { View } from "react-native";
import { AppText as Text } from "../../components/ui/AppText";
import { Button } from "../../components/ui/Button";
import { SplitButton } from "../../components/ui/SplitButton";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import { composerPullRequests } from "../../state/pull-requests";
import { useAtomCommand } from "../../state/use-atom-command";
import {
  allowedMergeMethods,
  canPerformPullRequestAction,
  mergeUnavailableReason,
  mergeMethodPresentation,
  PR_ACTION_ICONS,
  pullRequestActionLabel,
} from "./pullRequestActions";
import { pullRequestStackMerge, singlePullRequestMergeAllowed } from "./pullRequestStack";
import { pullRequestTarget, type PullRequestParams } from "./usePullRequestDiff";
import { usePullRequestAction } from "./usePullRequestAction";
import { usePullRequestPermissions } from "./usePullRequestPermissions";
import { PullRequestGlyph } from "./pullRequestGlyphs";
import type { AppSymbolName } from "../../components/ui/AppSymbol";
import type { PullRequestStackState } from "./usePullRequestStack";

export function PullRequestMergeControls(props: {
  readonly pr: PullRequestDetail;
  readonly params: PullRequestParams;
  readonly stack: PullRequestStackState;
}) {
  const { t, locale } = useLanguage();
  const { pr, stack } = props;
  const terminology = localizeChangeRequestTerminology(
    sourceControlClients.get(pr.provider).changeRequest,
    locale,
  );
  const target = pullRequestTarget(props.params);
  const permissions = usePullRequestPermissions(props.params, pr);
  const stateAction = usePullRequestAction(props.params, pr);
  const preferences = useAtomValue(mobilePreferencesAtom);
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const runAction = useAtomCommand(composerPullRequests.runAction, { reportFailure: false });
  const refreshDetail = useAtomRefresh(composerPullRequests.detail(target));
  const refreshActivity = useAtomRefresh(composerPullRequests.activity(target));
  const [selectedMethod, setSelectedMethod] = useState<PullRequestMergeMethod | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const methods = allowedMergeMethods(pr);
  const preferred =
    selectedMethod ??
    (AsyncResult.isSuccess(preferences) ? preferences.value.pullRequestMergeMethod : undefined) ??
    "squash";
  const method = methods.includes(preferred)
    ? preferred
    : methods.includes("squash")
      ? "squash"
      : methods[0];
  const scope = stack.stack
    ? pullRequestStackMerge(stack.stack, pr.number, terminology, locale)
    : null;
  const canMergeSingle = singlePullRequestMergeAllowed({
    supportsStackActions: stack.supportsStackActions,
    hasStack: stack.stack !== null,
    isFresh: stack.isFresh,
  });
  const checkingStack =
    permissions.connected && stack.supportsStackActions && !stack.isFresh && !stack.error;
  const reason =
    (!permissions.connected
      ? t("prMerge.reconnect")
      : mergeUnavailableReason(pr, permissions.canWrite, terminology, locale)) ??
    (stack.stack
      ? !stack.supportsStackActions
        ? t("prMerge.displayOnly")
        : !stack.isFresh
          ? t("prMerge.refreshFirst")
          : scope?.reason
      : !canMergeSingle
        ? stack.error
          ? t("prMerge.checkFailed")
          : t("prMerge.checkingMembership")
        : null);
  const canMerge = !busy && method !== undefined && !reason;
  const label = method
    ? scope && scope.layers.length > 1
      ? t("prMerge.stackLabel", {
          method: mergeMethodPresentation(method, locale).title,
          count: scope.layers.length,
        })
      : mergeMethodPresentation(method, locale).title
    : t("prMerge.unavailable");
  const nextAction =
    pr.state === "closed" ? "reopen" : pr.state === "open" && pr.isDraft ? "ready" : null;
  // States the button itself names, instead of a reason line under it. Draft and
  // closed offer their way forward when the viewer can take it.
  const status: {
    label: string;
    icon: AppSymbolName;
    final?: boolean;
    action?: "ready" | "reopen";
  } | null =
    nextAction && stateAction.available(nextAction)
      ? {
          label: pullRequestActionLabel(nextAction, terminology, locale),
          icon: PR_ACTION_ICONS[nextAction],
          final: nextAction === "reopen",
          action: nextAction,
        }
      : pr.state === "merged"
        ? { label: t("prMerge.merged"), icon: PullRequestGlyph.merged, final: true }
        : pr.state === "closed"
          ? { label: t("prMerge.closed"), icon: PullRequestGlyph.closed, final: true }
          : pr.isDraft
            ? { label: t("prMerge.draft"), icon: PullRequestGlyph.draft }
            : pr.mergeability === "conflicting"
              ? { label: t("prMerge.conflicts"), icon: PullRequestGlyph.conflicting }
              : pr.autoMergeEnabled
                ? {
                    label: t("prMerge.autoPending", {
                      method: pr.autoMergeMethod ? ` (${pr.autoMergeMethod})` : "",
                    }),
                    icon: "clock",
                  }
                : checkingStack && !busy
                  ? { label: t("prMerge.checking"), icon: PullRequestGlyph.merged }
                  : null;
  const autoAction = pr.autoMergeEnabled ? "disable-auto-merge" : "enable-auto-merge";
  const canAutoMerge =
    !busy &&
    (autoAction === "disable-auto-merge" || (!stack.stack && canMergeSingle)) &&
    permissions.canWrite &&
    canPerformPullRequestAction(pr, autoAction);

  const perform = async (action: "merge" | "enable-auto-merge" | "disable-auto-merge") => {
    if (
      pending.current ||
      (action !== "disable-auto-merge" && !method) ||
      (action === "merge" ? !canMerge : !canAutoMerge)
    )
      return;
    pending.current = true;
    setBusy(true);
    const response = await runAction({
      ...target,
      input: {
        ...target.input,
        action,
        ...(action === "merge" && method && stack.stack && scope
          ? {
              stackNumber: stack.stack.number,
              expectedStackHeads: scope.heads,
              mergeMethod: method,
            }
          : action === "merge" && method
            ? {
                resolveMergeMethod: (fresh) => {
                  if (
                    !canPerformPullRequestAction(fresh, "merge") ||
                    !allowedMergeMethods(fresh).includes(method)
                  )
                    throw new Error(t("prMerge.changed", { request: terminology.singular }));
                  return method;
                },
              }
            : action === "enable-auto-merge" && method
              ? { mergeMethod: method }
              : {}),
      },
    });
    // A stack can partly merge before the provider reports a failure.
    if (!AsyncResult.isSuccess(response)) refreshDetail();
    refreshActivity();
    stack.refresh();
    pending.current = false;
    setBusy(false);
    if (AsyncResult.isFailure(response)) {
      const cause = squashAtomCommandFailure(response);
      Dialog.alert(
        t("prMerge.failed"),
        cause instanceof Error ? cause.message : t("prMerge.retry"),
      );
    }
  };
  const confirm = (action: "merge" | "enable-auto-merge" | "disable-auto-merge") => {
    const title =
      action === "merge"
        ? scope && scope.layers.length > 1
          ? t("prMerge.layersTitle", { count: scope.layers.length })
          : t("prMerge.mergeTitle", {
              action: pullRequestActionLabel("merge", terminology, locale),
            })
        : action === "enable-auto-merge"
          ? t("prMerge.enableTitle")
          : t("prMerge.disableTitle");
    const message =
      action === "merge" && scope
        ? t("prMerge.stackConfirmation", {
            layers: scope.layers.map((layer) => `#${layer.number}`).join(" → "),
            base: stack.stack?.base ?? "",
            method: method ?? "",
            number: pr.number,
          })
        : action === "enable-auto-merge"
          ? t("prMerge.autoConfirmation", { number: pr.number, method: method ?? "" })
          : action === "disable-auto-merge"
            ? t("prMerge.disableConfirmation", { request: terminology.singular })
            : t("prMerge.confirmation", {
                number: pr.number,
                base: pr.baseBranch,
                method: method ?? "",
              });
    Dialog.alert(title, message, [
      { text: t("prMerge.cancel"), style: "cancel" },
      {
        text: action === "merge" ? label : title.replace(/[?？]$/, ""),
        onPress: () => void perform(action),
      },
    ]);
  };
  return (
    <View className="gap-2 border-t border-border-subtle p-3">
      <SplitButton
        label={
          busy || stateAction.busy
            ? t("prMerge.working")
            : !permissions.connected
              ? t("prMerge.reconnectAction")
              : (status?.label ?? label)
        }
        accessibilityLabel={
          status
            ? status.label
            : scope
              ? t("prMerge.layersLabel", { label, count: scope.layers.length, number: pr.number })
              : label
        }
        icon={status?.icon ?? PullRequestGlyph.merged}
        disabled={status?.action ? stateAction.busy : !canMerge || status !== null}
        loading={busy || stateAction.busy || (!status?.action && checkingStack)}
        onPress={() =>
          status?.action ? void stateAction.perform(status.action) : confirm("merge")
        }
        menuTitle={t("prMerge.options")}
        actions={
          status?.final
            ? []
            : [
                ...methods.map((id) => ({
                  id,
                  title: mergeMethodPresentation(id, locale).title,
                  state: id === method ? ("on" as const) : ("off" as const),
                  attributes: { disabled: !canMerge && !canAutoMerge },
                })),
                ...(canAutoMerge
                  ? [
                      {
                        id: autoAction,
                        title: pr.autoMergeEnabled ? t("prMerge.disable") : t("prMerge.enable"),
                        image: "clock",
                      },
                    ]
                  : []),
              ]
        }
        onPressAction={(id) => {
          const selected = methods.find((method) => method === id);
          if (selected) {
            setSelectedMethod(selected);
            savePreferences({ pullRequestMergeMethod: selected });
          } else if (id === autoAction && canAutoMerge) confirm(autoAction);
        }}
      />
      {permissions.connected && !status && reason ? (
        <Text className="px-1 text-xs text-foreground-muted">{reason}</Text>
      ) : null}
      {stack.error && stack.supportsStackActions ? (
        <Button label={t("prMerge.retryStack")} tone="text" onPress={stack.refresh} />
      ) : null}
    </View>
  );
}
