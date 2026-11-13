import { ScreenScrollView as ScrollView } from "../../components/ui/ScreenScrollView";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText as Text } from "../../components/ui/AppText";
import { DEFAULT_COMPOSER_ENTER_BEHAVIOR } from "../../lib/composerEnterBehavior";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import { ListChoiceRow as SettingsChoiceRow } from "../../components/ui/ListChoiceRow";
import { SettingsScreen } from "./components/SettingsScreen";
import { SettingsSection } from "./components/SettingsSection";
import { useLanguage } from "../../i18n/LanguageProvider";

const SEND_MODIFIER = Platform.OS === "android" ? "Ctrl" : "Command";

const ENTER_BEHAVIOR_OPTIONS = [
  {
    behavior: "send",
    label: "settings.keyboard.send",
    description: "settings.keyboard.sendDescription",
  },
  {
    behavior: "newline",
    label: "settings.keyboard.newline",
    description: "settings.keyboard.newlineDescription",
  },
] as const;

export function SettingsKeyboardRouteScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const preferencesResult = useAtomValue(mobilePreferencesAtom);
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const preferencesReady = AsyncResult.isSuccess(preferencesResult) && !preferencesResult.waiting;
  const selectedBehavior = AsyncResult.isSuccess(preferencesResult)
    ? (preferencesResult.value.composerEnterBehavior ?? DEFAULT_COMPOSER_ENTER_BEHAVIOR)
    : null;

  return (
    <SettingsScreen title={t("settings.keyboard.title")}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-3 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
      >
        <SettingsSection title={t("settings.keyboard.returnKey")}>
          {ENTER_BEHAVIOR_OPTIONS.map((option, index) => (
            <SettingsChoiceRow
              key={option.behavior}
              label={t(option.label)}
              description={t(option.description, { modifier: SEND_MODIFIER })}
              selected={selectedBehavior === option.behavior}
              separated={index > 0}
              disabled={!preferencesReady}
              onPress={() => savePreferences({ composerEnterBehavior: option.behavior })}
            />
          ))}
        </SettingsSection>
        <Text className="px-2 text-sm text-foreground-muted">
          {t("settings.keyboard.hardwareHint")}
        </Text>
      </ScrollView>
    </SettingsScreen>
  );
}
