import { makeTranslator, type UiTranslator } from "../../i18n/translator";
import type { EnvironmentId } from "@t3tools/contracts";

import type { AppBarMenuItem } from "../../components/ui/AppBar.types";

export interface HomeListFilterMenuEnvironment {
  readonly environmentId: EnvironmentId;
  readonly label: string;
}

export interface HomeListFilterMenuProject {
  readonly key: string;
  readonly label: string;
}

export function buildHomeListFilterMenuItems(props: {
  readonly translate?: UiTranslator;
  readonly environments: ReadonlyArray<HomeListFilterMenuEnvironment>;
  readonly projects: ReadonlyArray<HomeListFilterMenuProject>;
  readonly selectedEnvironmentId: EnvironmentId | null;
  readonly selectedProjectKey: string | null;
  readonly onEnvironmentChange: (environmentId: EnvironmentId | null) => void;
  readonly onProjectChange: (projectKey: string | null) => void;
}): AppBarMenuItem[] {
  const t = props.translate ?? makeTranslator("en");
  const items: AppBarMenuItem[] = [
    {
      id: "environment",
      title: t("homeFilters.environment"),
      items: [
        {
          id: "environment:all",
          title: t("homeFilters.allEnvironments"),
          subtitle: t("homeFilters.everyEnvironment"),
          selected: props.selectedEnvironmentId === null,
          onPress: () => props.onEnvironmentChange(null),
        },
        ...props.environments.map((environment) => ({
          id: `environment:${environment.environmentId}`,
          title: environment.label,
          selected: props.selectedEnvironmentId === environment.environmentId,
          onPress: () => props.onEnvironmentChange(environment.environmentId),
        })),
      ],
    },
  ];

  if (props.projects.length > 0) {
    items.push({
      id: "project",
      title: t("homeFilters.project"),
      items: [
        {
          id: "project:all",
          title: t("homeFilters.allProjects"),
          subtitle: t("homeFilters.everyProject"),
          selected: props.selectedProjectKey === null,
          onPress: () => props.onProjectChange(null),
        },
        ...props.projects.map((project) => ({
          id: `project:${project.key}`,
          title: project.label,
          selected: props.selectedProjectKey === project.key,
          onPress: () => props.onProjectChange(project.key),
        })),
      ],
    });
  }

  return items;
}
