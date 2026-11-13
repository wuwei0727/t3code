import {
  navigationCustomizationAvailable,
  overflowNavigationTabs,
} from "../layout/workspace/navigation-tab-order";
import {
  NAVIGATION_TAB_ICONS,
  useWorkspaceTabLabels,
  useNavigationTabOrder,
  useHiddenNavigationTabs,
} from "../layout/workspace/navigation-tabs";
import { currentWorkspaceSelections } from "../layout/workspace/workspace-selection-store";
import { rememberedSettingsPage } from "../layout/workspace/workspace-tab-navigation";
import { useSelectWorkspaceTab } from "../layout/workspace/useSelectWorkspaceTab";
import { useWorkspaceTabs } from "../layout/workspace/WorkspaceTabsContext";
import { ScreenScrollView as ScrollView } from "../../components/ui/ScreenScrollView";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth, useUser } from "@clerk/expo";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { use, type ComponentProps } from "react";
import { Platform, View } from "react-native";
import { useNativeColumnLayoutMetrics } from "../../native/native-layout-metrics";
import { deriveProjectGroupLabel } from "@t3tools/client-runtime/state/project-grouping";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hasCloudPublicConfig } from "../cloud/publicConfig";
import { useAdaptiveWorkspaceLayout } from "../layout/adaptive-workspace-context";
import { useSavedRemoteConnections } from "../../state/use-remote-environment-registry";
import { SettingsRow } from "./components/SettingsRow";
import { SettingsSection, SettingsSidebarContext } from "./components/SettingsSection";
import { SettingsScreen } from "./components/SettingsScreen";
import type { SettingsPageTarget } from "./components/settings-page-targets";
import { useSettingsEnvironmentMenu } from "./components/SettingsEnvironmentFilterHeader";
import { useSettingsEnvironmentFilter } from "./settings-environment-filter";
import { filterSettingsSections } from "./settings-search";
import { usePaneRole } from "../../components/ui/Pane";
import { useLanguage } from "../../i18n/LanguageProvider";

export function SettingsRouteScreen() {
  const list = useSettingsListPlacement();
  return <SettingsListScreen sidebar={list.sidebar} selected={list.selected} />;
}

/** The Settings list inside a workspace shell that draws its bar, title and search itself. */
export function WorkspaceSettingsList() {
  const list = useSettingsListPlacement();
  return (
    <SettingsSidebarContext value={list.sidebar ? { selected: list.selected } : null}>
      <View className="flex-1 bg-screen">
        <SettingsListContent />
      </View>
    </SettingsSidebarContext>
  );
}

function useSettingsListPlacement() {
  const sidebar = usePaneRole() === "sidebar";
  // The page open beside the list: the route right above the Settings tab's route. While
  // another tab is open this list stays mounted, hidden, and must keep showing the page Settings
  // reopens on; otherwise returning shows it unselected for a frame before the page arrives.
  const selected = useNavigationState((state) => {
    const list = state.routes.findIndex((route) => route.name === "Settings");
    return list < 0
      ? rememberedSettingsPage(currentWorkspaceSelections())
      : (state.routes[list + 1]?.name ?? null);
  });
  return { sidebar, selected };
}

function SettingsListContent() {
  return hasCloudPublicConfig() ? <ConfiguredSettingsRouteScreen /> : <LocalSettingsRouteScreen />;
}

export function SettingsListScreen(props: {
  readonly sidebar: boolean;
  readonly selected: string | null;
}) {
  const { t } = useLanguage();
  const workspace = useWorkspaceTabs();
  const environmentMenu = useSettingsEnvironmentMenu();
  return (
    <SettingsSidebarContext value={props.sidebar ? { selected: props.selected } : null}>
      <View className="flex-1 bg-screen">
        <SettingsScreen
          title={t("settings.title")}
          workspaceRoot={props.sidebar}
          menus={[environmentMenu]}
          search={
            workspace
              ? {
                  value: workspace.state.tabs.settings.query,
                  onChangeText: (query) =>
                    workspace.dispatch({ type: "query", tab: "settings", query }),
                  placeholder: t("settings.search"),
                }
              : undefined
          }
        >
          <SettingsListContent />
        </SettingsScreen>
      </View>
    </SettingsSidebarContext>
  );
}

type SettingsListRow = ComponentProps<typeof SettingsRow> & { readonly id: string };

interface SettingsListSection {
  readonly title?: string;
  readonly rows: readonly SettingsListRow[];
}

function ConfiguredSettingsRouteScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const { isLoaded, isSignedIn } = useAuth({ treatPendingAsSignedOut: false });
  const { user } = useUser();
  const { savedConnectionsById } = useSavedRemoteConnections();
  const accountLabel = !isLoaded
    ? t("settings.checking")
    : !isSignedIn
      ? t("settings.signIn")
      : (user?.primaryEmailAddress?.emailAddress ?? t("settings.signedIn"));

  return (
    <SettingsList
      connections={[
        {
          id: "account",
          icon: "person.crop.circle",
          label: t("settings.account"),
          value: accountLabel,
          disabled: !isLoaded,
          onPress: () => navigation.navigate("SettingsAuth"),
        },
        environmentsRow(Object.keys(savedConnectionsById).length, t("connection.environments")),
        {
          id: "SettingsNotifications",
          icon: "bell.badge",
          label: t("settings.notifications"),
          target: "SettingsNotifications",
        },
      ]}
    />
  );
}

function LocalSettingsRouteScreen() {
  const { t } = useLanguage();
  const { savedConnectionsById } = useSavedRemoteConnections();
  return (
    <SettingsList
      connections={[
        environmentsRow(Object.keys(savedConnectionsById).length, t("connection.environments")),
      ]}
    />
  );
}

function environmentsRow(count: number, label: string): SettingsListRow {
  return {
    id: "SettingsEnvironments",
    icon: "desktopcomputer",
    label,
    value: `${count}`,
    valuePosition: "trailing",
    target: "SettingsEnvironments",
  };
}

function SettingsList(props: { readonly connections: readonly SettingsListRow[] }) {
  const { t } = useLanguage();
  // UIKit's scroll-edge material takes the scroll view's own color; like the chat list, match
  // the sidebar's surface so the bar doesn't darken over content at rest.
  // Grouped cards only lift off the screen surface; the drawer is as dark as they are.
  const listSurface = use(SettingsSidebarContext) ? "bg-drawer" : "bg-screen";
  const insets = useSafeAreaInsets();
  // UIKit insets the scroll view by its column's safe area, which this context can report as 0.
  const bottomSafeArea = useNativeColumnLayoutMetrics()?.safeArea.bottom ?? insets.bottom;
  const workspace = useWorkspaceTabs();
  const query = workspace?.state.tabs.settings.query ?? "";
  const overflowRows = useOverflowRows();
  const indexSections = useSettingsIndexSections();
  const sections = filterSettingsSections(
    [
      { rows: overflowRows },
      { title: t("settings.connections"), rows: props.connections },
      ...indexSections,
    ],
    query,
  );

  return (
    <View collapsable={false} className="flex-1">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className={`flex-1 ${listSurface}`}
        contentContainerClassName="gap-4 px-5 pt-4"
        contentContainerStyle={{
          // The workspace's clearance keeps the last row above its search field and keyboard.
          paddingBottom:
            Platform.OS === "ios"
              ? Math.max(Math.max(bottomSafeArea, 18) + 18, workspace?.bottomClearance ?? 0) -
                bottomSafeArea
              : Math.max(Math.max(insets.bottom, 18) + 18, workspace?.bottomClearance ?? 0),
        }}
      >
        {sections.length ? (
          sections.map((section, index) => (
            <SettingsSection key={section.title ?? `untitled-${index}`} title={section.title}>
              {section.rows.map(({ id, ...row }) => (
                <SettingsRow key={id} {...row} />
              ))}
            </SettingsSection>
          ))
        ) : (
          <EmptyState
            variant="plain"
            title={t("settings.noResults")}
            detail={t("settings.noMatch", { query: query.trim() })}
          />
        )}
      </ScrollView>
    </View>
  );
}

function useSettingsIndexSections(): SettingsListSection[] {
  const { t } = useLanguage();
  const { selectedTargets, projectGroups, selectedProjectKey } = useSettingsEnvironmentFilter();
  const noServerTargets = selectedTargets.length === 0;
  const selectedProject = projectGroups.find((group) => group.key === selectedProjectKey);
  const scopedProjectMembers =
    selectedProject?.members
      .map((member) => member.project)
      .filter((project) =>
        selectedTargets.some((target) => target.environmentId === project.environmentId),
      ) ?? [];
  const projectLabel =
    scopedProjectMembers.length > 0
      ? deriveProjectGroupLabel({
          representative: scopedProjectMembers[0]!,
          members: scopedProjectMembers,
        })
      : (selectedProject?.label ?? t("settings.unavailableProject"));
  const page = (
    target: SettingsPageTarget,
    icon: SettingsListRow["icon"],
    label: string,
    extra?: Pick<SettingsListRow, "disabled" | "value">,
  ): SettingsListRow => ({ id: target, icon, label, target, ...extra });
  const serverPage = (target: SettingsPageTarget, icon: SettingsListRow["icon"], label: string) =>
    page(target, icon, label, { disabled: noServerTargets });
  // The same pages and groups as Settings on web, minus what mobile has no setting for.
  return [
    {
      rows: [
        page("SettingsOrganization", "gearshape", t("settings.general")),
        page("SettingsAppearance", "paintbrush", t("settings.appearance")),
        page("SettingsFollowUp", "bubble.left.and.bubble.right", t("settings.chat")),
        ...(navigationCustomizationAvailable()
          ? [page("SettingsNavigation", "line.3.horizontal", t("settings.navigationTabs"))]
          : []),
        page("SettingsKeyboard", "keyboard", t("settings.keyboard")),
        page("SettingsVoice", "mic", t("settings.voice")),
      ],
    },
    {
      title: t("settings.agents"),
      rows: [
        serverPage("SettingsProviderAccounts", "person.crop.circle", t("settings.providers")),
        serverPage("SettingsThreads", "text.bubble", t("settings.threads")),
        page("SettingsScheduledTasks", "clock", t("settings.scheduledTasks")),
      ],
    },
    {
      title: t("settings.code"),
      rows: [
        page(
          "SettingsProjectOverview",
          "folder",
          t("settings.projects"),
          selectedProjectKey !== null ? { value: projectLabel } : undefined,
        ),
        serverPage(
          "SettingsEnvironmentSourceControl",
          "arrow.triangle.branch",
          t("settings.sourceControl"),
        ),
        serverPage("SettingsWorktrees", "square.on.square", t("settings.worktrees")),
      ],
    },
    {
      rows: [
        serverPage("SettingsEnvironmentMaintenance", "arrow.clockwise", t("settings.maintenance")),
        page("SettingsLabs", "flask", t("settings.labs")),
        page("SettingsAbout", "info.circle", t("settings.about")),
        page("SettingsArchive", "archivebox", t("settings.archive")),
      ],
    },
  ];
}

function useOverflowRows(): SettingsListRow[] {
  const labels = useWorkspaceTabLabels();
  const order = useNavigationTabOrder();
  const hidden = useHiddenNavigationTabs();
  const { layout } = useAdaptiveWorkspaceLayout();
  const tabs =
    Platform.OS === "android" && layout.usesSplitView ? [] : overflowNavigationTabs(order, hidden);
  const selectTab = useSelectWorkspaceTab();
  return tabs.map((tab) => ({
    id: tab,
    icon: NAVIGATION_TAB_ICONS[tab],
    label: labels[tab],
    onPress: () => selectTab(tab),
  }));
}
