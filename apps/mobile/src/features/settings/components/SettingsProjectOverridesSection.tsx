import { useLanguage } from "../../../i18n/LanguageProvider";
import { View } from "react-native";

import { Button } from "../../../components/ui/Button";
import { AppText as Text } from "../../../components/ui/AppText";
import { SettingsSection } from "./SettingsSection";

export function SettingsProjectOverridesSection(props: {
  readonly projectLabel: string;
  readonly hasOverrides: boolean;
  readonly pending: boolean;
  readonly disabled?: boolean;
  readonly onClear: () => void;
}) {
  const { t } = useLanguage();
  return (
    <SettingsSection title={t("settings.overrides.project")}>
      <View className="min-h-16 flex-row items-center gap-3 px-4 py-3">
        <Text className="min-w-0 flex-1 text-base text-foreground" numberOfLines={2}>
          {props.projectLabel}
        </Text>
        {!props.pending && props.hasOverrides ? (
          <Button
            label={t("settings.overrides.defaults")}
            accessibilityHint={t("settings.overrides.hint")}
            tone="text"
            disabled={props.disabled}
            onPress={props.onClear}
          />
        ) : null}
      </View>
    </SettingsSection>
  );
}
