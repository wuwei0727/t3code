import { useLanguage } from "../../i18n/LanguageProvider";
import { View } from "react-native";

import { Notice } from "../../components/ui/Notice";
import { setFreshSessionPending, useComposerDraftSettings } from "../../state/use-composer-drafts";

/** Shown while `/clear` is armed; dismissing it keeps the current session. */
export function FreshSessionNotice(props: { readonly threadKey: string }) {
  const { t } = useLanguage();
  if (useComposerDraftSettings(props.threadKey).freshContext !== true) return null;
  return (
    <View className="px-4 pb-3">
      <Notice
        message={t("freshNotice.message")}
        icon="arrow.clockwise"
        floating
        onDismiss={() => setFreshSessionPending(props.threadKey, false)}
        dismissLabel={t("freshNotice.keep")}
      />
    </View>
  );
}
