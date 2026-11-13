import { useLanguage } from "../../../i18n/LanguageProvider";
import { useNavigation } from "@react-navigation/native";
import { View } from "react-native";
import { EmptyState } from "../../../components/ui/EmptyState";
import { openSettings } from "../../settings/settings-navigation";

export function WorkspaceNoTabs() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  return (
    <View className="flex-1 items-center justify-center bg-screen">
      <EmptyState
        title={t("noTabs.title")}
        detail={t("noTabs.detail")}
        actionLabel={t("noTabs.edit")}
        variant="plain"
        onAction={() => openSettings(navigation, "SettingsNavigation")}
      />
    </View>
  );
}
