import { localizeChangeRequestTerminology } from "./changeRequestTerminology";
import { useLanguage } from "../../i18n/LanguageProvider";
import { AsyncResult } from "effect/reactivity";
import * as Dialog from "../../components/ui/Dialog";
import { useAtomRefresh } from "@effect/atom-react";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";
import { sourceControlClients } from "@t3tools/client-runtime/source-control-clients";
import type {
  PullRequestAction,
  PullRequestDetail,
  PullRequestUpdateMethod,
} from "@t3tools/contracts";
import { useRef, useState } from "react";
import { composerPullRequests } from "../../state/pull-requests";
import { useAtomCommand } from "../../state/use-atom-command";
import { canPerformPullRequestAction, pullRequestActionLabel } from "./pullRequestActions";
import { pullRequestTarget, type PullRequestParams } from "./usePullRequestDiff";
import { usePullRequestPermissions } from "./usePullRequestPermissions";

export function usePullRequestAction(params: PullRequestParams, pr: PullRequestDetail | null) {
  const { t, locale } = useLanguage();
  const target = pullRequestTarget(params);
  const permissions = usePullRequestPermissions(params, pr);
  const run = useAtomCommand(composerPullRequests.runAction, { reportFailure: false });
  const refreshActivity = useAtomRefresh(composerPullRequests.activity(target));
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const available = (action: PullRequestAction) =>
    pr !== null && !busy && permissions.canWrite && canPerformPullRequestAction(pr, action);
  const perform = async (action: PullRequestAction, updateMethod?: PullRequestUpdateMethod) => {
    if (pending.current || !available(action)) return;
    pending.current = true;
    setBusy(true);
    const response = await run({
      ...target,
      input: { ...target.input, action, ...(updateMethod ? { updateMethod } : {}) },
    });
    pending.current = false;
    setBusy(false);
    if (AsyncResult.isFailure(response)) {
      const cause = squashAtomCommandFailure(response);
      Dialog.alert(
        t("prActionUi.failed", {
          request: localizeChangeRequestTerminology(
            sourceControlClients.get(pr?.provider).changeRequest,
            locale,
          ).singular,
        }),
        cause instanceof Error ? cause.message : t("prActionUi.retry"),
      );
      return;
    }
    refreshActivity();
  };
  const confirm = (action: PullRequestAction, title: string, message: string) =>
    Dialog.alert(title, message, [
      { text: t("prActionUi.cancel"), style: "cancel" },
      {
        text: title,
        style: action === "close" || action === "delete-branch" ? "destructive" : "default",
        onPress: () => void perform(action),
      },
    ]);
  const confirmClose = () => {
    const terminology = sourceControlClients.get(pr?.provider).changeRequest;
    confirm(
      "close",
      pullRequestActionLabel("close", terminology, locale),
      t("prActionUi.close", {
        request: localizeChangeRequestTerminology(terminology, locale).singular,
      }),
    );
  };
  return { available, perform, confirm, confirmClose, busy };
}
