import type { UiTranslator } from "../i18n/translator";

export function nativeMarkdownUi(t: UiTranslator) {
  return {
    selectionMenuConfig: {
      copy: { label: t("nativeMarkdownUi.copy") },
      copyAsMarkdown: { label: t("nativeMarkdownUi.markdown") },
      copyImageUrl: {
        label: t("nativeMarkdownUi.image"),
        pluralLabels: { one: t("nativeMarkdownUi.image"), other: t("nativeMarkdownUi.imageMany") },
      },
    },
    accessibilityLabels: {
      list: {
        bulletPoint: t("nativeMarkdownUi.bullet"),
        nestedBulletPoint: t("nativeMarkdownUi.nestedBullet"),
        orderedItem: t("nativeMarkdownUi.item"),
        nestedOrderedItem: t("nativeMarkdownUi.nestedItem"),
      },
      blockquote: {
        quote: t("nativeMarkdownUi.quote"),
        nestedQuote: t("nativeMarkdownUi.nestedQuote"),
      },
      table: { row: t("nativeMarkdownUi.row") },
      math: { equation: t("nativeMarkdownUi.math") },
      codeBlock: { wrap: t("nativeMarkdownUi.wrap"), unwrap: t("nativeMarkdownUi.unwrap") },
      rotor: {
        headings: t("nativeMarkdownUi.headings"),
        links: t("nativeMarkdownUi.links"),
        images: t("nativeMarkdownUi.images"),
      },
    },
  };
}
