import { View } from "react-native";
import { Notice } from "../../components/ui/Notice";
import { useLanguage } from "../../i18n/LanguageProvider";
import { appErrorText } from "../../i18n/appErrorPresentation";

export function ComposerErrorNotice(props: {
  readonly message: string;
  readonly onDismiss: () => void;
}) {
  const { t } = useLanguage();
  return (
    <View className="px-4 pb-3">
      <Notice
        message={appErrorText(props.message, t)}
        icon="exclamationmark.circle"
        iconTone="danger"
        floating
        onDismiss={props.onDismiss}
        dismissLabel={t("appError.dismiss")}
      />
    </View>
  );
}
