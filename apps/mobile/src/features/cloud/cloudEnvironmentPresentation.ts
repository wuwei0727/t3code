import type { UiLocale } from "../../i18n/locale";
import { makeTranslator } from "../../i18n/translator";
import type { RelayEnvironmentStatusResponse } from "@t3tools/contracts/relay";
import {
  orchestrationProtocolCompatibilityError,
  type EnvironmentConnectionPhase,
} from "@t3tools/client-runtime/connection";
import { relayOfflineReasonMessage } from "@t3tools/client-runtime/relay";

export interface AvailableCloudEnvironmentPresentation {
  readonly connectionError: string | null;
  readonly connectionErrorTraceId: string | null;
  readonly connectionState: EnvironmentConnectionPhase;
  readonly statusText: string;
}

export function availableCloudEnvironmentPresentation(
  input: {
    readonly isStatusPending: boolean;
    readonly status: RelayEnvironmentStatusResponse | null;
    readonly statusError: string | null;
    readonly statusErrorTraceId: string | null;
  },
  locale: UiLocale = "en",
): AvailableCloudEnvironmentPresentation {
  const t = makeTranslator(locale);
  const compatibilityError =
    input.status?.descriptor === undefined
      ? null
      : orchestrationProtocolCompatibilityError(input.status.descriptor);
  if (compatibilityError !== null) {
    return {
      connectionError: compatibilityError.message,
      connectionErrorTraceId: null,
      connectionState: "unsupported",
      statusText: compatibilityError.message,
    };
  }
  if (input.status?.status === "online") {
    return {
      connectionError: null,
      connectionErrorTraceId: null,
      connectionState: "available",
      statusText: t("cloudEnvironments.online"),
    };
  }

  if (input.status?.status === "offline") {
    const connectionError =
      relayOfflineReasonMessage(input.status) ?? input.status.error ?? "Relay is offline.";
    return {
      connectionError,
      connectionErrorTraceId: input.status.traceId ?? null,
      connectionState: "error",
      statusText:
        input.status.offlineReason === "tunnel_released"
          ? t("cloudEnvironments.released")
          : (input.status.error ?? t("cloudEnvironments.relayOffline")),
    };
  }

  if (input.statusError) {
    return {
      connectionError: input.statusError,
      connectionErrorTraceId: input.statusErrorTraceId,
      connectionState: "error",
      statusText: input.statusError,
    };
  }

  return {
    connectionError: null,
    connectionErrorTraceId: null,
    connectionState: "available",
    statusText: input.isStatusPending
      ? t("cloudEnvironments.checking")
      : t("cloudEnvironments.unknown"),
  };
}
