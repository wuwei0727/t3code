import { makeTranslator, type UiTranslator } from "../../i18n/translator";
import type { WorkspaceState } from "../../state/workspaceModel";

export interface WorkspaceConnectionStatusPresentation {
  readonly label: string;
  readonly showsProgress: boolean;
}

function shouldShowWorkspaceConnectionStatus(state: WorkspaceState): boolean {
  if (state.networkStatus === "offline") return true;
  if (state.hasReadyEnvironment) return state.hasSyncingConnectedEnvironment;
  return (
    state.connectionError !== null ||
    state.hasConnectingEnvironment ||
    state.hasPendingShellSnapshot ||
    (state.hasLoadedShellSnapshot && !state.hasReadyEnvironment)
  );
}

function workspaceConnectionStatusLabel(state: WorkspaceState, t: UiTranslator): string {
  if (state.networkStatus === "offline") return t("workspaceStatus.offline");
  if (state.hasReadyEnvironment && state.hasSyncingConnectedEnvironment) {
    return state.hasLoadedShellSnapshot
      ? t("workspaceStatus.syncing")
      : t("workspaceStatus.loading");
  }
  if (state.connectingEnvironments.length === 1) {
    return t("workspaceStatus.reconnect", {
      environment: state.connectingEnvironments[0]!.environmentLabel,
    });
  }
  if (state.connectingEnvironments.length > 1) {
    return t("workspaceStatus.many", { count: state.connectingEnvironments.length });
  }
  if (state.connectionError !== null) return state.connectionError;
  if (state.hasPendingShellSnapshot) {
    return state.hasLoadedShellSnapshot
      ? t("workspaceStatus.syncing")
      : t("workspaceStatus.loading");
  }
  return t("workspaceStatus.none");
}

export function workspaceConnectionStatusPresentation(
  state: WorkspaceState,
  t: UiTranslator = makeTranslator("en"),
): WorkspaceConnectionStatusPresentation | null {
  if (!shouldShowWorkspaceConnectionStatus(state)) return null;
  return {
    label: workspaceConnectionStatusLabel(state, t),
    showsProgress:
      state.networkStatus !== "offline" &&
      (state.hasReadyEnvironment || state.connectionError === null) &&
      (state.connectingEnvironments.length > 0 || state.hasPendingShellSnapshot),
  };
}
