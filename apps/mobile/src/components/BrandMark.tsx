import { useLanguage } from "../i18n/LanguageProvider";
import Constants from "expo-constants";
import { Image } from "expo-image";
import { View } from "react-native";

import { AppText as Text } from "./ui/AppText";
import { T3_CODE_BRAND_MARK_SOURCE } from "./brandAssets";

const appVariant = Constants.expoConfig?.extra?.appVariant;
const defaultStageKey =
  appVariant === "development"
    ? "brandUi.dev"
    : appVariant === "preview"
      ? "brandUi.preview"
      : "brandUi.beta";

export function BrandMark(props: { readonly compact?: boolean; readonly stageLabel?: string }) {
  const { t } = useLanguage();
  const compact = props.compact ?? false;
  const iconSize = compact ? 32 : 44;
  const stageLabel = props.stageLabel ?? t(defaultStageKey);

  return (
    <View className="flex-row items-center gap-3">
      <Image
        source={T3_CODE_BRAND_MARK_SOURCE}
        accessibilityIgnoresInvertColors
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: compact ? 10 : 14,
        }}
      />
      <View className="gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-lg font-t3-bold tracking-[-0.4px] text-foreground">T3 Code</Text>
          <View className="rounded-full bg-subtle px-2 py-1">
            <Text className="text-3xs font-t3-bold tracking-[1.1px] uppercase text-foreground-muted">
              {stageLabel}
            </Text>
          </View>
        </View>
        {!compact ? (
          <Text className="text-xs font-medium text-foreground-muted">{t("brandUi.detail")}</Text>
        ) : null}
      </View>
    </View>
  );
}
