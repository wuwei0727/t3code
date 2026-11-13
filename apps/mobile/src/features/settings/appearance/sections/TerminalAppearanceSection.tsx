import { useLanguage } from "../../../../i18n/LanguageProvider";
import {
  MAX_TERMINAL_FONT_SIZE,
  MIN_TERMINAL_FONT_SIZE,
  TERMINAL_FONT_SIZE_STEP,
} from "../../../../lib/appearancePreferences";
import { SettingsSection } from "../../components/SettingsSection";
import { SettingsSwitchRow } from "../../components/SettingsSwitchRow";
import { useAppearancePreferences } from "../AppearancePreferencesProvider";
import {
  AppearancePreviewSeparator,
  TerminalAppearancePreview,
} from "../components/AppearancePreviews";
import { FontSizeSliderRow } from "../components/FontSizeSliderRow";

export function TerminalAppearanceSection() {
  const { t } = useLanguage();
  const { isReady, appearance, setTerminalFontSize } = useAppearancePreferences();
  const custom = appearance.isTerminalFontSizeCustom;

  const handleToggleCustom = (enabled: boolean) => {
    setTerminalFontSize(enabled ? appearance.terminalFontSize : null);
  };

  return (
    <SettingsSection title={t("appearance.terminal")}>
      <TerminalAppearancePreview fontSize={appearance.terminalFontSize} />
      <AppearancePreviewSeparator />
      <SettingsSwitchRow
        disabled={!isReady}
        icon="terminal"
        label={t("appearance.customFont")}
        onValueChange={handleToggleCustom}
        value={custom}
      />
      {custom ? (
        <FontSizeSliderRow
          disabled={!isReady}
          icon="textformat.size"
          label={t("appearance.fontSize")}
          max={MAX_TERMINAL_FONT_SIZE}
          min={MIN_TERMINAL_FONT_SIZE}
          onChange={setTerminalFontSize}
          step={TERMINAL_FONT_SIZE_STEP}
          value={appearance.terminalFontSize}
          valueLabel={`${appearance.terminalFontSize.toFixed(1)} pt`}
        />
      ) : null}
    </SettingsSection>
  );
}
