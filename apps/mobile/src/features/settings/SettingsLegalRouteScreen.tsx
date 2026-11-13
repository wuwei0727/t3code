import { useLanguage } from "../../i18n/LanguageProvider";
import { SettingsLegalDocumentRouteScreen } from "./components/SettingsLegalDocumentRouteScreen";
import { LEGAL_URL } from "./lib/legal-document-url";

export function SettingsLegalRouteScreen() {
  const { t } = useLanguage();
  return (
    <SettingsLegalDocumentRouteScreen
      documentName={t("settings.about.legal")}
      documentUrl={LEGAL_URL}
    />
  );
}
