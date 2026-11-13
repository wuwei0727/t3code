import { makeTranslator, type UiTranslator } from "../../i18n/translator";
import type { OrchestrationV2UserMessageInputIntent } from "@t3tools/contracts";

export interface UserMessageIntentBadgePresentation {
  readonly label: string;
  readonly accessibilityLabel: string;
}

export function resolveUserMessageIntentBadge(
  intent: OrchestrationV2UserMessageInputIntent | undefined,
  unread = false,
  t: UiTranslator = makeTranslator("en"),
): UserMessageIntentBadgePresentation | null {
  if (unread && (intent === "steer" || intent === "promoted_queued_to_steer")) {
    return {
      label: t("messageIntent.waiting"),
      accessibilityLabel: t("messageIntent.waitingHint"),
    };
  }
  switch (intent) {
    case "steer":
      return {
        label: t("messageIntent.steer"),
        accessibilityLabel: t("messageIntent.steered"),
      };
    case "promoted_queued_to_steer":
      return {
        label: t("messageIntent.steer"),
        accessibilityLabel: t("messageIntent.promoted"),
      };
    case "queued_turn":
    case "turn_start":
    case undefined:
      return null;
  }
}
