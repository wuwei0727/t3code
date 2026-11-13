import { useLanguage } from "../../i18n/LanguageProvider";
import type { useReviewHeaderPresentation as useIosReviewHeaderPresentation } from "./useReviewHeaderPresentation";

export function useReviewHeaderPresentation(
  props: Parameters<typeof useIosReviewHeaderPresentation>[0],
): ReturnType<typeof useIosReviewHeaderPresentation> {
  const { t } = useLanguage();
  return {
    title: t("reviewHeaderAndroid.title"),
    subtitle: props.androidSubtitle || t("reviewHeaderAndroid.select"),
    gitMenu: null,
    menuIcon: "ellipsis.circle",
    refreshAction: {
      id: "refresh",
      title: t("reviewHeaderAndroid.refresh"),
      disabled: !props.selectedSection || props.selectedSection.isLoading,
      onPress: () => {
        void props.onRefresh();
      },
    },
  };
}
