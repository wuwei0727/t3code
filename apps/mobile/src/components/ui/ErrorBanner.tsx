import { Notice } from "./Notice";
import { useLanguage } from "../../i18n/LanguageProvider";
import { appErrorText } from "../../i18n/appErrorPresentation";

export function ErrorBanner(props: { readonly message: string }) {
  const { t } = useLanguage();
  return <Notice tone="danger" message={appErrorText(props.message, t)} />;
}
