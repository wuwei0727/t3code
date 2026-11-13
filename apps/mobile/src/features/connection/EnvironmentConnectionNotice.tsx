import { useLanguage } from "../../i18n/LanguageProvider";
import type { UiTranslator } from "../../i18n/translator";
import { Button } from "../../components/ui/Button";
import { AppActivityIndicator } from "../../components/ui/AppActivityIndicator";
import { ConnectionTraceId } from "./ConnectionTraceId";
import {
  type EnvironmentConnectionPhase,
  type EnvironmentConnectionPresentation,
} from "@t3tools/client-runtime/connection";
import { SymbolView } from "../../components/ui/AppSymbol";
import { View } from "react-native";

import { AppText as Text } from "../../components/ui/AppText";

function noticeTitle(
  phase: EnvironmentConnectionPhase,
  environmentLabel: string,
  t: UiTranslator,
): string {
  switch (phase) {
    case "offline":
      return t("connection.notice.offline");
    case "connecting":
      return t("connection.notice.connecting", { environment: environmentLabel });
    case "reconnecting":
      return t("connection.notice.reconnecting", { environment: environmentLabel });
    case "unsupported":
      return t("connection.notice.unsupported");
    case "error":
      return t("connection.notice.unavailable", { environment: environmentLabel });
    case "available":
      return t("connection.notice.disconnected", { environment: environmentLabel });
    case "connected":
      return "";
  }
}

function noticeDetail(
  phase: EnvironmentConnectionPhase,
  resourceName: string,
  error: string | null,
  t: UiTranslator,
): string {
  if (error) {
    return phase === "reconnecting" ? t("connection.notice.autoRetry", { error }) : error;
  }

  switch (phase) {
    case "offline":
      return t("connection.notice.cached", { resource: resourceName });
    case "connecting":
    case "reconnecting":
      return t("connection.notice.ready", { resource: resourceName });
    case "unsupported":
      return t("connection.notice.compatible");
    case "available":
    case "error":
      return t("connection.notice.reconnectResource", { resource: resourceName });
    case "connected":
      return "";
  }
}

export function EnvironmentConnectionNotice(props: {
  readonly environmentLabel: string;
  readonly connection: EnvironmentConnectionPresentation;
  readonly resourceName: string;
  readonly onRetry: () => void;
}) {
  const { t } = useLanguage();
  const resourceName =
    props.resourceName === "review"
      ? t("connection.notice.review")
      : props.resourceName === "preview"
        ? t("connection.notice.preview")
        : props.resourceName === "terminal"
          ? t("connection.notice.terminal")
          : props.resourceName;
  const isRetrying =
    props.connection.phase === "connecting" || props.connection.phase === "reconnecting";

  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="max-w-[320px] items-center gap-3">
        {isRetrying ? (
          <AppActivityIndicator size="small" colorClassName={"accent-icon-muted"} />
        ) : (
          <SymbolView
            name={props.connection.phase === "offline" ? "wifi.slash" : "bolt.horizontal.circle"}
            size={24}
            tintColorClassName={"accent-icon-muted"}
            type="monochrome"
          />
        )}

        <Text className="text-center text-lg font-t3-bold text-foreground">
          {noticeTitle(props.connection.phase, props.environmentLabel, t)}
        </Text>
        <Text className="text-center text-sm leading-normal text-foreground-muted">
          {noticeDetail(props.connection.phase, resourceName, props.connection.error, t)}
          {props.connection.traceId ? (
            <ConnectionTraceId traceId={props.connection.traceId} />
          ) : null}
        </Text>

        {props.connection.phase !== "offline" && props.connection.phase !== "unsupported" ? (
          <View className="mt-1">
            <Button label={t("connection.notice.retry")} tone="secondary" onPress={props.onRetry} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
