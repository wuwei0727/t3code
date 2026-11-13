import type { UiLocale } from "../../i18n/locale";
import { makeTranslator } from "../../i18n/translator";
import type { VoiceInputState } from "@t3tools/client-runtime/voice-input";
import { voiceErrorKeys } from "./voiceErrorCatalog";

export type VoiceComposerPresentation = {
  readonly leadingAction: "cancel" | null;
  readonly trailingAction: "mic" | "confirm";
  readonly showsSend: boolean;
  readonly statusKind: "active" | "error" | null;
  readonly statusLabel: string | null;
  readonly confirmationEnabled: boolean;
};

export function resolveVoiceComposerPresentation(
  state: VoiceInputState,
  elapsedSeconds: number,
  locale: UiLocale = "en",
): VoiceComposerPresentation {
  const t = makeTranslator(locale);
  switch (state.phase) {
    case "idle":
      return {
        leadingAction: null,
        trailingAction: "mic",
        showsSend: true,
        statusKind: null,
        statusLabel: null,
        confirmationEnabled: false,
      };
    case "error":
      return {
        leadingAction: null,
        trailingAction: "mic",
        showsSend: true,
        statusKind: "error",
        statusLabel:
          state.error && Object.hasOwn(voiceErrorKeys, state.error)
            ? t(voiceErrorKeys[state.error as keyof typeof voiceErrorKeys])
            : state.error,
        confirmationEnabled: false,
      };
    case "preparing":
      return {
        leadingAction: "cancel",
        trailingAction: "confirm",
        showsSend: false,
        statusKind: "active",
        statusLabel: t("dictation.preparing"),
        confirmationEnabled: false,
      };
    case "recording": {
      const seconds = Math.max(0, Math.floor(elapsedSeconds));
      return {
        leadingAction: "cancel",
        trailingAction: "confirm",
        showsSend: false,
        statusKind: "active",
        statusLabel: t("dictation.recording", {
          time: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
        }),
        confirmationEnabled: true,
      };
    }
    case "transcribing":
    case "post-processing":
      return {
        leadingAction: "cancel",
        trailingAction: "confirm",
        showsSend: false,
        statusKind: "active",
        statusLabel: t("dictation.transcribing"),
        confirmationEnabled: false,
      };
  }
}
