import type { UiLocale } from "../../i18n/locale";
import { makeTranslator } from "../../i18n/translator";
import {
  alternateComposerDispatchAction,
  type ActiveTurnComposerAction,
} from "@t3tools/client-runtime/state/composer-dispatch";

import type { FollowUpBehavior } from "../../lib/followUpBehavior";

export interface ComposerSendPresentation {
  readonly label: string;
  readonly icon:
    | "arrow.up"
    | "tray.and.arrow.up"
    | "checkmark"
    | "list.number"
    | "arrow.turn.left.up";
  readonly action: ActiveTurnComposerAction | null;
  readonly alternate: ActiveTurnComposerAction | null;
  readonly offersFollowUpChoice: boolean;
}

const ACTION_LABEL = {
  queue: "composerUi.send.queue",
  steer: "composerUi.send.steer",
  restart: "composerUi.send.restart",
} as const satisfies Record<ActiveTurnComposerAction, string>;

export function resolveComposerSendPresentation(
  input: {
    readonly editingQueuedMessage: boolean;
    readonly running: boolean;
    readonly canSteer: boolean;
    readonly followUpBehavior: FollowUpBehavior;
    readonly deliveryDeferred: boolean;
  },
  locale: UiLocale = "en",
): ComposerSendPresentation {
  const t = makeTranslator(locale);
  if (input.editingQueuedMessage) {
    return {
      label: t("composerUi.send.update"),
      icon: "checkmark",
      action: null,
      alternate: null,
      offersFollowUpChoice: false,
    };
  }
  if (!input.running) {
    return {
      label: t(input.deliveryDeferred ? "composerUi.send.queue" : "composerUi.send.send"),
      icon: input.deliveryDeferred ? "tray.and.arrow.up" : "arrow.up",
      action: null,
      alternate: null,
      offersFollowUpChoice: false,
    };
  }
  const action: ActiveTurnComposerAction = input.canSteer ? input.followUpBehavior : "queue";
  const alternate = alternateComposerDispatchAction(action);
  return {
    label: t(ACTION_LABEL[action]),
    icon: action === "steer" ? "arrow.turn.left.up" : "list.number",
    action,
    alternate: input.canSteer ? alternate : null,
    offersFollowUpChoice: input.canSteer,
  };
}
