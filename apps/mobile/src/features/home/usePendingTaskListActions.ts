import { useLanguage } from "../../i18n/LanguageProvider";
import * as Dialog from "../../components/ui/Dialog";
import { useCallback } from "react";

import { removeThreadOutboxMessage } from "../../state/thread-outbox-removal";
import { clearComposerDraftContent } from "../../state/use-composer-drafts";
import type { PendingNewTask } from "../../state/use-pending-new-tasks";
import { appAtomRegistry } from "../../state/atom-registry";
import {
  editingQueuedMessageIdsAtom,
  holdEditingQueuedMessage,
  releaseEditingQueuedMessage,
} from "../../state/use-thread-outbox";
import { withThreadDismissal } from "./thread-dismissal";

export function usePendingTaskListActions(
  selectThreadRoute: (params: ReactNavigation.RootParamList["Thread"]) => void,
): {
  readonly openPendingTask: (pendingTask: PendingNewTask) => void;
  readonly confirmDeletePendingTask: (pendingTask: PendingNewTask) => void;
} {
  const { t } = useLanguage();
  const openPendingTask = useCallback(
    (pendingTask: PendingNewTask) => {
      selectThreadRoute(
        pendingTask.kind === "pending"
          ? {
              environmentId: String(pendingTask.environmentId),
              threadId: String(pendingTask.message.threadId),
            }
          : {
              draft: {
                environmentId: String(pendingTask.environmentId),
                projectId: String(pendingTask.projectId),
                draftId: pendingTask.draftKey,
              },
            },
      );
    },
    [selectThreadRoute],
  );

  const confirmDeletePendingTask = useCallback(
    (pendingTask: PendingNewTask) => {
      if (pendingTask.kind === "draft") {
        Dialog.alert(
          t("pendingTaskActions.discardQuestion"),
          t("pendingTaskActions.remove", { title: pendingTask.title }),
          [
            { text: t("pendingTaskActions.cancel"), style: "cancel" },
            {
              text: t("pendingTaskActions.discard"),
              style: "destructive",
              onPress: () => {
                void withThreadDismissal(
                  pendingTask.key,
                  async () =>
                    clearComposerDraftContent(pendingTask.draftKey, {
                      clearModelSelection: true,
                      clearWorkspaceSelection: true,
                    }),
                  () => true,
                );
              },
            },
          ],
        );
        return;
      }
      Dialog.alert(
        t("pendingTaskActions.deleteQuestion"),
        t("pendingTaskActions.outbox", { title: pendingTask.title }),
        [
          { text: t("pendingTaskActions.cancel"), style: "cancel" },
          {
            text: t("pendingTaskActions.delete"),
            style: "destructive",
            onPress: () => {
              // Hold delivery from confirmation so reconnects cannot send a task during removal.
              // The editor can release the shared hold mid-animation; remove edited tasks at once.
              // Keep an editor's hold unless removal succeeds.
              const messageId = pendingTask.message.messageId;
              const heldByEditor = appAtomRegistry.get(editingQueuedMessageIdsAtom)[messageId];
              holdEditingQueuedMessage(messageId);
              const releaseUnlessEditing = () => {
                if (!heldByEditor) releaseEditingQueuedMessage(messageId);
              };
              const remove = () => removeThreadOutboxMessage(pendingTask.message);
              void (
                heldByEditor
                  ? remove()
                  : withThreadDismissal(pendingTask.key, remove, (removed) => removed)
              )
                .then((removed) =>
                  removed ? releaseEditingQueuedMessage(messageId) : releaseUnlessEditing(),
                )
                .catch((error) => {
                  releaseUnlessEditing();
                  Dialog.alert(
                    t("pendingTaskActions.failed"),
                    error instanceof Error ? error.message : t("pendingTaskActions.failure"),
                  );
                });
            },
          },
        ],
      );
    },
    [t],
  );

  return { openPendingTask, confirmDeletePendingTask };
}
