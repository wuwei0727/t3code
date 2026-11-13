import { View } from "react-native";
import { ListChoiceRow } from "../../../../components/ui/ListChoiceRow";
import { useLanguage } from "../../../../i18n/LanguageProvider";
import { SettingsSection } from "../../components/SettingsSection";

export function LanguageAppearanceSection() {
  const { t, language, setLanguage, isReady } = useLanguage();
  const choices = [
    { value: "system", label: t("settings.language.system") },
    { value: "en", label: t("settings.language.en") },
    { value: "zh-CN", label: t("settings.language.zhCN") },
  ] as const;
  return (
    <SettingsSection title={t("settings.language.title")}>
      <View accessibilityRole="radiogroup">
        {choices.map((choice, index) => (
          <ListChoiceRow
            key={choice.value}
            label={choice.label}
            selected={language === choice.value}
            disabled={!isReady}
            separated={index > 0}
            onPress={() => setLanguage(choice.value)}
          />
        ))}
      </View>
    </SettingsSection>
  );
}
