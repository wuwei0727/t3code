import { useLanguage } from "../../i18n/LanguageProvider";
import { appErrorText } from "../../i18n/appErrorPresentation";
import type { UiTranslator } from "../../i18n/translator";
import { findErrorTraceId } from "@t3tools/client-runtime/errors";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import type { MenuAction } from "@react-native-menu/menu";
import type { EnvironmentId } from "@t3tools/contracts";
import type { RelayClientEnvironmentRecord } from "@t3tools/contracts/relay";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { AppActivityIndicator } from "../../components/ui/AppActivityIndicator";
import { SymbolView } from "../../components/ui/AppSymbol";
import * as Dialog from "../../components/ui/Dialog";
import { Menu } from "../../components/ui/Menu";
import { copyTextWithHaptic } from "../../lib/copyTextWithHaptic";
import { relayEnvironmentDiscovery } from "../../state/relay";
import { useAtomCommand } from "../../state/use-atom-command";
import {
  deregisterManagedRelayEnvironmentCommand,
  useManagedRelayEnvironments,
} from "./managedRelayState";

function linkedAtLabel(value: string, formatter: Intl.DateTimeFormat, t: UiTranslator): string {
  const linkedAt = new Date(value);
  return Number.isNaN(linkedAt.getTime())
    ? t("connectProfile.dateUnavailable")
    : t("connectProfile.linked", { date: formatter.format(linkedAt) });
}

function endpointLabel(environment: RelayClientEnvironmentRecord, t: UiTranslator): string {
  return environment.endpoint.providerKind === "cloudflare_tunnel"
    ? t("connectProfile.managedTunnel")
    : t("connectProfile.activityOnly");
}

function confirmDeregister(
  environment: RelayClientEnvironmentRecord,
  onConfirm: () => void,
  t: UiTranslator,
) {
  const title = t("connectProfile.deregisterConfirm");
  const message = t("connectProfile.deregisterHelp", { environment: environment.label });
  Dialog.confirm({
    title,
    message,
    confirmText: t("connectProfile.deregister"),
    destructive: true,
    onConfirm,
  });
}

export function T3ConnectProfilePage() {
  const { t, locale } = useLanguage();
  const linkedAtFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }),
    [locale],
  );
  const environmentsState = useManagedRelayEnvironments();
  const deregisterEnvironment = useAtomCommand(deregisterManagedRelayEnvironmentCommand, {
    reportFailure: false,
  });
  const refreshRelayEnvironments = useAtomCommand(relayEnvironmentDiscovery.refreshAfterMutation, {
    reportFailure: false,
  });
  const [deregisteringEnvironmentId, setDeregisteringEnvironmentId] =
    useState<EnvironmentId | null>(null);
  const mutationPendingRef = useRef(false);
  // Hide cached rows by linkedAt until refresh; re-linking changes linkedAt and restores visibility.
  const [removedEnvironments, setRemovedEnvironments] = useState<{
    readonly accountId: string | null;
    readonly linkedAtById: ReadonlyMap<EnvironmentId, string>;
  }>({ accountId: null, linkedAtById: new Map() });

  const handleDeregister = async (environment: RelayClientEnvironmentRecord) => {
    const accountId = environmentsState.accountId;
    if (!accountId || mutationPendingRef.current) return;

    mutationPendingRef.current = true;
    setDeregisteringEnvironmentId(environment.environmentId);
    const result = await deregisterEnvironment({
      accountId,
      environmentId: environment.environmentId,
    });
    mutationPendingRef.current = false;
    setDeregisteringEnvironmentId(null);

    if (result._tag === "Success") {
      setRemovedEnvironments((current) => {
        const linkedAtById = new Map(current.accountId === accountId ? current.linkedAtById : []);
        linkedAtById.set(environment.environmentId, environment.linkedAt);
        return { accountId, linkedAtById };
      });
      environmentsState.refresh();
      void refreshRelayEnvironments();
      return;
    }
    if (isAtomCommandInterrupted(result)) return;

    const cause = squashAtomCommandFailure(result);
    const message = cause instanceof Error ? cause.message : "Could not deregister the server.";
    const traceId = findErrorTraceId(cause);
    console.error("[t3-connect] Could not deregister environment", {
      environmentId: environment.environmentId,
      message,
      traceId,
      cause,
    });
    const visibleMessage =
      cause instanceof Error ? message : t("connectProfile.deregisterFailedHelp");
    Dialog.alert(
      t("connectProfile.deregisterFailed"),
      traceId
        ? t("connectProfile.traceDetails", { message: visibleMessage, traceId })
        : visibleMessage,
      traceId
        ? [
            {
              text: t("connectProfile.copyTrace"),
              onPress: () => copyTextWithHaptic(traceId, { target: "connection-trace-id" }),
            },
            { text: t("common.ok"), style: "cancel" },
          ]
        : undefined,
    );
  };

  const removedEnvironmentLinkedAt =
    removedEnvironments.accountId === environmentsState.accountId
      ? removedEnvironments.linkedAtById
      : new Map<EnvironmentId, string>();
  const environments = (environmentsState.data ?? []).filter(
    (environment) =>
      removedEnvironmentLinkedAt.get(environment.environmentId) !== environment.linkedAt,
  );
  const isInitialLoad =
    !environmentsState.accountId || (environmentsState.data === null && !environmentsState.error);
  const errorTraceId = environmentsState.errorTraceId;

  return (
    <ScrollView
      className="flex-1 bg-clerk-page"
      contentContainerClassName="pb-8"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={environmentsState.isPending && environmentsState.data !== null}
          onRefresh={environmentsState.refresh}
        />
      }
    >
      <ClerkSectionHeader>{t("connectProfile.servers")}</ClerkSectionHeader>

      {environmentsState.error ? (
        <>
          <ClerkRow
            title={t("connectProfile.loadFailed")}
            subtitle={appErrorText(environmentsState.error, t)}
          />
          {errorTraceId ? (
            <ClerkButtonRow
              label={t("connectProfile.copyTrace")}
              onPress={() => {
                copyTextWithHaptic(errorTraceId, { target: "connection-trace-id" });
              }}
            />
          ) : null}
        </>
      ) : isInitialLoad ? (
        <View className="flex-row items-center gap-3 px-6 py-4">
          <AppActivityIndicator colorClassName={"accent-clerk-foreground-muted"} size="small" />
          <Text className="text-base text-clerk-foreground-muted">
            {t("connectProfile.loading")}
          </Text>
        </View>
      ) : environments.length > 0 ? (
        environments.map((environment) => (
          <ClerkRow
            key={environment.environmentId}
            title={environment.label}
            subtitle={`${linkedAtLabel(environment.linkedAt, linkedAtFormatter, t)} · ${endpointLabel(environment, t)}`}
            accessory={
              deregisteringEnvironmentId === environment.environmentId ? (
                <AppActivityIndicator
                  colorClassName={"accent-clerk-foreground-muted"}
                  size="small"
                />
              ) : (
                <Menu
                  actions={ENVIRONMENT_MENU_ACTIONS.map((action) => ({
                    ...action,
                    title: t("connectProfile.deregister"),
                  }))}
                  isAnchoredToRight
                  onPressAction={() =>
                    confirmDeregister(environment, () => void handleDeregister(environment), t)
                  }
                >
                  <Pressable
                    accessibilityLabel={t("connectProfile.actions", {
                      environment: environment.label,
                    })}
                    accessibilityRole="button"
                    disabled={deregisteringEnvironmentId !== null}
                    className="size-[30px] items-center justify-center active:opacity-60 disabled:opacity-50"
                  >
                    <View className="rotate-90">
                      <SymbolView
                        name="ellipsis"
                        size={18}
                        tintColorClassName={"accent-clerk-foreground-muted"}
                        type="monochrome"
                      />
                    </View>
                  </Pressable>
                </Menu>
              )
            }
          />
        ))
      ) : (
        <ClerkRow title={t("connectProfile.none")} subtitle={t("connectProfile.linkHelp")} />
      )}

      <Text className="px-6 pt-6 text-xs leading-normal text-clerk-foreground-muted">
        {t("connectProfile.deviceConnections")}
      </Text>
    </ScrollView>
  );
}

const ENVIRONMENT_MENU_ACTIONS = [
  { id: "deregister", title: "Deregister", image: "trash", attributes: { destructive: true } },
] satisfies MenuAction[];

function ClerkSectionHeader(props: { readonly children: string }) {
  return (
    <Text className="min-h-4 border-b border-clerk-border px-6 pt-8 pb-4 text-xs font-medium tracking-[0.3px] text-clerk-foreground-muted uppercase">
      {props.children}
    </Text>
  );
}

function ClerkRow(props: {
  readonly title: string;
  readonly subtitle: string;
  readonly accessory?: ReactNode;
}) {
  return (
    <View
      collapsable={false}
      className="flex-row items-center gap-3 border-b border-clerk-border px-6 py-4"
    >
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="min-h-[22px] text-base text-clerk-foreground" numberOfLines={1}>
          {props.title}
        </Text>
        <Text className="min-h-5 text-sm text-clerk-foreground-muted" numberOfLines={2}>
          {props.subtitle}
        </Text>
      </View>
      {props.accessory}
    </View>
  );
}

function ClerkButtonRow(props: { readonly label: string; readonly onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      className="border-b border-clerk-border px-6 py-4 active:opacity-60"
    >
      <Text className="text-base font-semibold text-clerk-foreground">{props.label}</Text>
    </Pressable>
  );
}
