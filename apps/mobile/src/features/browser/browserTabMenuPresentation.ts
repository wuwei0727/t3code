import type { UiTranslator } from "../../i18n/translator";
import { FILL_PREVIEW_VIEWPORT, type PreviewViewportSetting } from "@t3tools/contracts";
import { PREVIEW_VIEWPORT_PRESETS } from "@t3tools/shared/previewViewport";

export const browserViewportChoices = (t: UiTranslator) => [
  { id: "fill", title: t("browserMenu.fit"), setting: FILL_PREVIEW_VIEWPORT },
  ...(["Phone", "Tablet", "Desktop"] as const).flatMap((category) => {
    const preset = PREVIEW_VIEWPORT_PRESETS.find((candidate) => candidate.category === category);
    if (!preset) return [];
    const setting: PreviewViewportSetting = {
      _tag: "preset",
      presetId: preset.id,
      width: preset.width,
      height: preset.height,
    };
    return [
      {
        id: `preset:${preset.id}`,
        title: `${t(`browserMenu.category.${category}`)} (${preset.label})`,
        setting,
      },
    ];
  }),
];
