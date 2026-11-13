import { useLanguage } from "../../../i18n/LanguageProvider";
import {
  MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS,
  MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS,
} from "@t3tools/contracts";
import type { ComponentProps } from "react";
import { NumberField } from "../../../components/ui/NumberField";

export type AutoSettleDaysFieldProps = Pick<
  ComponentProps<typeof NumberField>,
  "value" | "onValueChange" | "disabled"
>;

export function AutoSettleDaysField(props: AutoSettleDaysFieldProps) {
  const { t } = useLanguage();
  return (
    <NumberField
      {...props}
      min={MIN_SIDEBAR_AUTO_SETTLE_AFTER_DAYS}
      max={MAX_SIDEBAR_AUTO_SETTLE_AFTER_DAYS}
      label={t("settings.autoSettle.daysLabel")}
      formatValue={(value) =>
        t(value === 1 ? "settings.autoSettle.day" : "settings.autoSettle.days", { count: value })
      }
    />
  );
}
