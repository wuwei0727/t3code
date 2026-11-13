import type { EnvironmentMachineKind } from "@t3tools/contracts";
import { useLanguage } from "../i18n/LanguageProvider";
import { SymbolView, type AppSymbolName } from "./ui/AppSymbol";

export const ENVIRONMENT_MACHINE_SYMBOLS = {
  server: "server.rack",
  cloud: "cloud",
  linux: "terminal",
  desktop: "desktopcomputer",
  laptop: "laptopcomputer",
  "mac-mini": "macmini",
  "mac-studio": "macstudio",
} as const satisfies Record<EnvironmentMachineKind, AppSymbolName>;

const ENVIRONMENT_MACHINE_KIND_LABELS = {
  server: "machineKind.server",
  cloud: "machineKind.cloud",
  linux: "machineKind.linux",
  desktop: "machineKind.desktop",
  laptop: "machineKind.laptop",
  "mac-mini": "machineKind.mini",
  "mac-studio": "machineKind.workstation",
} as const satisfies Record<EnvironmentMachineKind, string>;

export function EnvironmentMachineSymbol(props: {
  readonly kind: EnvironmentMachineKind;
  readonly size: number;
  readonly tintColorClassName: string;
}) {
  const { t } = useLanguage();
  return (
    <SymbolView
      accessibilityLabel={t(ENVIRONMENT_MACHINE_KIND_LABELS[props.kind])}
      name={ENVIRONMENT_MACHINE_SYMBOLS[props.kind]}
      size={props.size}
      tintColorClassName={props.tintColorClassName}
      type="monochrome"
    />
  );
}
