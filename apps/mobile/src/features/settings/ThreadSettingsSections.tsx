import { useLanguage } from "../../i18n/LanguageProvider";
import { Button } from "../../components/ui/Button";
import {
  AuthSettingsWriteScope,
  isManagedSettingPath,
  type ServerSettingsPatch,
} from "@t3tools/contracts";
import { useEnvironmentsWithScope } from "../../state/session";
import { AutoSettleDaysField } from "./components/AutoSettleDaysField";
import { ScreenScrollView as ScrollView } from "../../components/ui/ScreenScrollView";
import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import type { ComponentProps } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DEFAULT_SERVER_SETTINGS } from "@t3tools/contracts";
import { supportsSharedSettingsSync } from "@t3tools/client-runtime/state/shared-settings";
import { AppText as Text } from "../../components/ui/AppText";
import { useEnvironments } from "../../state/environments";
import { mobilePreferencesAtom, updateMobilePreferencesAtom } from "../../state/preferences";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { SettingsSection } from "./components/SettingsSection";
import { SettingsSwitchRow } from "./components/SettingsSwitchRow";
import { SettingsScreen } from "./components/SettingsScreen";
import { planAutoSettleSettingsSync, type AutoSettleSettings } from "./autoSettleSettingsSync";
import { useSettingsEnvironmentFilter } from "./settings-environment-filter";
import {
  managedSettingReason,
  resolveMobileSettingsTargets,
  uniformMobileSetting,
} from "./settings-scoped-server";

export function SettingsLabsRouteScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  return (
    <SettingsScreen title={t("settings.threadSections.labs")}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
      >
        <MachineBetaSection
          title={t("settings.threadSections.linked")}
          icon="link"
          capability="peerLinks"
          setting="linkedEnvironmentsEnabled"
          description={t("settings.threadSections.linkedHelp")}
        />
        <MachineBetaSection
          title={t("settings.threadSections.fastCheckout")}
          icon="bolt.circle"
          capability="fastWorktreeCheckout"
          setting="fastWorktreeCheckout"
          description={t("settings.threadSections.fastCheckoutHelp")}
        />
      </ScrollView>
    </SettingsScreen>
  );
}

const AUTO_SETTLE_DEFAULT_DAYS = DEFAULT_SERVER_SETTINGS.sidebarAutoSettleAfterDays ?? 7;

/**
 * Usage-limit and auto-settle rows. The Threads page owns their writes, so they share its queue
 * with the page's other project overrides, and their project override reset.
 */
export function AutoSettleSettingsRows(props: {
  readonly write: (patch: ServerSettingsPatch) => void;
  readonly pending: boolean;
}) {
  const { t } = useLanguage();
  const { selectedTargets, projectGroups, selectedProjectKey } = useSettingsEnvironmentFilter();
  const selectedProject = projectGroups.find((group) => group.key === selectedProjectKey);
  const writableEnvironments = useEnvironmentsWithScope(selectedTargets, AuthSettingsWriteScope);
  const projectSelected = selectedProjectKey !== null;

  const projectMembers = projectSelected
    ? (selectedProject?.members.map((member) => member.project) ?? [])
    : null;
  const displayTargets = resolveMobileSettingsTargets(
    selectedTargets.filter(supportsSharedSettingsSync),
    projectMembers,
  );
  // The page saves to all its targets, so any read-only one blocks the save.
  const canWriteSettings =
    displayTargets.length > 0 &&
    resolveMobileSettingsTargets(selectedTargets, projectMembers).every((target) =>
      writableEnvironments.has(target.environment.environmentId),
    );
  const reference = displayTargets[0] ?? null;
  const referenceSettings = reference?.settings ?? null;

  if (reference === null || referenceSettings === null) {
    return null;
  }

  const writeToAll = (
    patch: Partial<AutoSettleSettings> & {
      autoResumeLimitedThreads?: boolean;
      snoozeLimitedThreads?: boolean;
    },
  ) => props.write(patch);

  const { patch: autoSettlePatch, mismatches } = planAutoSettleSettingsSync(
    {
      environmentId: reference.environment.environmentId,
      projectId: reference.projectId,
      settings: referenceSettings,
    },
    displayTargets.map((target) => ({
      environmentId: target.environment.environmentId,
      projectId: target.projectId,
      label: target.environment.label,
      settings: target.settings,
    })),
  );

  const disabled = !canWriteSettings || props.pending;
  const disabledFor = (...keys: string[]) =>
    disabled || managedSettingReason(displayTargets, ...keys) !== undefined;
  const afterDays = referenceSettings.sidebarAutoSettleAfterDays;

  return (
    <View className="gap-6">
      {!projectSelected ? (
        <SettingsSection title={t("settings.threadSections.usage")}>
          <SettingsSwitchRow
            icon="clock"
            label={t("settings.threadSections.resume")}
            subtitle={t("settings.threadSections.resumeHelp")}
            value={uniformMobileSetting(displayTargets, "autoResumeLimitedThreads")}
            disabled={disabledFor("autoResumeLimitedThreads")}
            onValueChange={(value) => writeToAll({ autoResumeLimitedThreads: value })}
          />
          <SettingsSwitchRow
            icon="clock"
            label={t("settings.threadSections.snooze")}
            subtitle={t("settings.threadSections.snoozeHelp")}
            value={uniformMobileSetting(displayTargets, "snoozeLimitedThreads")}
            disabled={disabledFor("snoozeLimitedThreads")}
            onValueChange={(value) => writeToAll({ snoozeLimitedThreads: value })}
          />
        </SettingsSection>
      ) : null}
      <SettingsSection title={t("settings.threadSections.autoSettle")}>
        <SettingsSwitchRow
          icon="arrow.triangle.branch"
          label={t("settings.threadSections.settleMerged")}
          value={referenceSettings.sidebarAutoSettleOnMerge}
          disabled={disabledFor("sidebarAutoSettleOnMerge")}
          onValueChange={(value) => writeToAll({ sidebarAutoSettleOnMerge: value })}
        />
        <SettingsSwitchRow
          icon="clock"
          label={t("settings.threadSections.settleInactive")}
          value={afterDays !== null}
          disabled={disabledFor("sidebarAutoSettleAfterDays")}
          onValueChange={(value) =>
            writeToAll({ sidebarAutoSettleAfterDays: value ? AUTO_SETTLE_DEFAULT_DAYS : null })
          }
        />
        {afterDays !== null ? (
          <View className="flex-row items-center gap-4 px-4 py-4 android:min-h-14 android:py-3">
            <View className="w-[22px] android:w-6" />
            <Text className="flex-1 text-foreground text-lg android:text-base">
              {t("settings.threadSections.inactiveDays")}
            </Text>
            <AutoSettleDaysField
              value={afterDays}
              disabled={disabledFor("sidebarAutoSettleAfterDays")}
              onValueChange={(value) => writeToAll({ sidebarAutoSettleAfterDays: value })}
            />
          </View>
        ) : null}
      </SettingsSection>
      {!props.pending && mismatches.length > 0 ? (
        <SettingsSection title={t("settings.threadSections.across")}>
          <View className="gap-3 p-4">
            <Text className="text-base text-foreground">{t("settings.threadSections.differ")}</Text>
            <Text className="text-sm text-foreground-muted">
              {mismatches.map((mismatch) => mismatch.label).join(", ")}
            </Text>
            <Button
              label={t("settings.threadSections.apply")}
              tone="secondary"
              disabled={disabledFor("sidebarAutoSettleOnMerge", "sidebarAutoSettleAfterDays")}
              onPress={() => writeToAll(autoSettlePatch)}
            />
          </View>
        </SettingsSection>
      ) : null}
    </View>
  );
}

export function WorkingSectionSettings() {
  const { t } = useLanguage();
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const preferences = useAtomValue(mobilePreferencesAtom);
  const workingShelfEnabled =
    AsyncResult.isSuccess(preferences) && preferences.value.workingShelfEnabled !== false;

  return (
    <View className="gap-3">
      <SettingsSection title={t("settings.threadSections.sidebar")}>
        <SettingsSwitchRow
          icon="bolt.circle"
          label={t("settings.threadSections.working")}
          value={workingShelfEnabled}
          onValueChange={(value) => savePreferences({ workingShelfEnabled: value })}
        />
      </SettingsSection>
      <Text className="px-2 text-sm text-foreground-muted">
        {t("settings.threadSections.workingHelp")}
      </Text>
    </View>
  );
}

export function NewThreadSettingsSection() {
  const { t } = useLanguage();
  const savePreferences = useAtomSet(updateMobilePreferencesAtom);
  const preferences = useAtomValue(mobilePreferencesAtom);
  const useLastProject =
    AsyncResult.isSuccess(preferences) && preferences.value.useLastProjectForNewThreads !== false;

  return (
    <SettingsSection title={t("settings.threadSections.newThreads")}>
      <SettingsSwitchRow
        icon="square.and.pencil"
        label={t("settings.threadSections.lastProject")}
        subtitle={t("settings.threadSections.lastProjectHelp")}
        value={useLastProject}
        onValueChange={(value) => savePreferences({ useLastProjectForNewThreads: value })}
      />
    </SettingsSection>
  );
}

type MachineBetaSetting = "linkedEnvironmentsEnabled" | "fastWorktreeCheckout";

/** One switch per connected machine that offers the beta, since each machine's own setting decides. */
function MachineBetaSection({
  title,
  icon,
  capability,
  setting,
  description,
}: {
  readonly title: string;
  readonly icon: ComponentProps<typeof SettingsSwitchRow>["icon"];
  readonly capability: "peerLinks" | "fastWorktreeCheckout";
  readonly setting: MachineBetaSetting;
  readonly description: string;
}) {
  const { t } = useLanguage();
  const { environments } = useEnvironments();
  const supported = environments.filter(
    (environment) =>
      environment.connection.phase === "connected" &&
      environment.serverConfig?.environment.capabilities[capability] === true,
  );
  const writable = useEnvironmentsWithScope(supported, AuthSettingsWriteScope);
  const updateSettings = useAtomCommand(serverEnvironment.updateSettings, {
    label: `${setting} beta update`,
    reportFailure: true,
  });
  if (supported.length === 0) return null;
  return (
    <View className="gap-3">
      <SettingsSection title={t("settings.threadSections.beta", { title })}>
        {supported.map((environment) => {
          const policy = environment.serverConfig?.managedPolicy;
          const managed = isManagedSettingPath(policy, setting);
          return (
            <SettingsSwitchRow
              key={environment.environmentId}
              icon={icon}
              label={environment.label}
              {...(managed
                ? {
                    subtitle: t("settings.threadSections.managed", {
                      organization: policy?.organization ?? "",
                    }),
                  }
                : {})}
              value={environment.serverConfig?.settings[setting] === true}
              disabled={managed || !writable.has(environment.environmentId)}
              onValueChange={(value) =>
                void updateSettings({
                  environmentId: environment.environmentId,
                  input: {
                    patch:
                      setting === "linkedEnvironmentsEnabled"
                        ? { linkedEnvironmentsEnabled: value }
                        : { fastWorktreeCheckout: value },
                  },
                })
              }
            />
          );
        })}
      </SettingsSection>
      <Text className="px-2 text-sm text-foreground-muted">{description}</Text>
    </View>
  );
}
