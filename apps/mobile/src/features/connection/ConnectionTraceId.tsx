import { useLanguage } from "../../i18n/LanguageProvider";
import { AppText as Text } from "../../components/ui/AppText";
import { cn } from "../../lib/cn";
import { copyTextWithHaptic } from "../../lib/copyTextWithHaptic";

export function ConnectionTraceId({
  traceId,
  tone = "muted",
  activation = "press",
}: {
  readonly traceId: string;
  readonly tone?: "muted" | "danger";
  readonly activation?: "press" | "longPress";
}) {
  const { t } = useLanguage();
  const copy = () => copyTextWithHaptic(traceId, { target: "connection-trace-id" });
  return (
    <>
      {t("connection.trace.prefix")}
      <Text
        accessibilityHint={
          activation === "longPress"
            ? t("connection.trace.longPress")
            : t("connection.trace.copyHint")
        }
        accessibilityLabel={t("connection.trace.copyLabel", { id: traceId })}
        accessibilityRole="button"
        accessibilityActions={[{ name: "activate", label: t("connection.trace.copy") }]}
        onAccessibilityAction={(event) => {
          event.stopPropagation();
          if (event.nativeEvent.actionName === "activate") copy();
        }}
        className={cn(
          "underline decoration-dotted",
          tone === "danger" ? "text-danger-foreground" : "text-foreground-muted",
        )}
        onLongPress={
          activation === "longPress"
            ? (event) => {
                event.stopPropagation();
                copy();
              }
            : undefined
        }
        onPress={(event) => {
          event.stopPropagation();
          if (activation === "press") copy();
        }}
      >
        {traceId}
      </Text>
    </>
  );
}
