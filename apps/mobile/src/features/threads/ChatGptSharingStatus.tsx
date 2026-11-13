import { useLanguage } from "../../i18n/LanguageProvider";
import * as Dialog from "../../components/ui/Dialog";
import type { ServerProvider } from "@t3tools/contracts";
import { CHATGPT_USAGE_URL, usesChatGptSharing } from "@t3tools/shared/usageLimits";
import { Linking, Pressable, View } from "react-native";
import { AppText as Text } from "../../components/ui/AppText";
import { ProviderIcon } from "../../components/ProviderIcon";

export function ChatGptSharingStatus({ provider }: { provider: ServerProvider | null }) {
  const { t } = useLanguage();
  if (!usesChatGptSharing(provider)) return null;
  return (
    <View className="flex-row items-center justify-between gap-3 px-3 py-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("chatgptSharing.active")}
        className="min-h-11 flex-row items-center gap-2"
        onPress={() => {
          Dialog.alert(
            t("chatgptSharing.on"),
            [provider?.auth.email, t("chatgptSharing.detail"), t("chatgptSharing.speed")]
              .filter(Boolean)
              .join("\n\n"),
          );
        }}
      >
        <ProviderIcon provider="codex" size={14} />
        <Text className="text-xs text-foreground-muted">{t("chatgptSharing.plan")}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        className="min-h-11 justify-center"
        onPress={() => void Linking.openURL(CHATGPT_USAGE_URL).catch(() => undefined)}
      >
        <Text className="text-xs font-t3-medium text-primary">{t("chatgptSharing.manage")}</Text>
      </Pressable>
    </View>
  );
}
