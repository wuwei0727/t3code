import { currentTranslator } from "../../i18n/currentLanguage";
import * as Dialog from "../../components/ui/Dialog";
import { buildNewThreadLink, type LinkedPrompt } from "@t3tools/shared/promptLinks";

import { tryCopyTextWithHaptic } from "../../lib/copyTextWithHaptic";
import {
  getComposerDraftSnapshot,
  setComposerDraftText,
  waitForComposerDraftsLoaded,
} from "../../state/use-composer-drafts";
import { linkedThreadDraftAction } from "./prompt-link-model";

export function showPromptLinkNotice(notice: string): void {
  Dialog.alert(currentTranslator()("promptLinkActions.title"), notice);
}

export async function applyLinkedPromptToThreadDraft(
  draftKey: string,
  prompt: LinkedPrompt,
  notice: string,
): Promise<void> {
  try {
    await waitForComposerDraftsLoaded();
  } catch {
    Dialog.alert(
      currentTranslator()("promptLinkActions.openFailed"),
      currentTranslator()("promptLinkActions.drafts"),
    );
    return;
  }
  const action = linkedThreadDraftAction(getComposerDraftSnapshot(draftKey).text, prompt.text);
  if (action !== "ask") {
    if (action === "fill") setComposerDraftText(draftKey, prompt.text);
    showPromptLinkNotice(notice);
    return;
  }
  Dialog.alert(currentTranslator()("promptLinkActions.replaceQuestion"), notice, [
    { text: currentTranslator()("promptLinkActions.keep"), style: "cancel" },
    {
      text: currentTranslator()("promptLinkActions.replace"),
      onPress: () => setComposerDraftText(draftKey, prompt.text),
    },
  ]);
}

export async function copyPromptLink(prompt: string): Promise<void> {
  if (!(await tryCopyTextWithHaptic(buildNewThreadLink({ prompt }), { target: "prompt link" }))) {
    Dialog.alert(
      currentTranslator()("promptLinkActions.copyFailed"),
      currentTranslator()("promptLinkActions.retry"),
    );
  }
}
