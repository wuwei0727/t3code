import type { DeviceServiceState, ThreadId } from "@t3tools/contracts";
import type { UiTranslator } from "../../i18n/translator";

/** Host identity is part of the selection because Android serials repeat across hosts. */
export function threadDevicePreviews(
  state: DeviceServiceState | null,
  threadId: ThreadId,
  t?: UiTranslator,
) {
  return (state?.sessions ?? [])
    .filter((session) => session.threadId === threadId)
    .map((session) => {
      const device = state?.devices.find(
        (device) => device.hostId === session.hostId && device.id === session.deviceId,
      );
      const host = state?.hosts.find((host) => host.id === session.hostId);
      const hostLabel =
        host?.kind === "local" && host.label === "This machine" && t
          ? t("devicePreview.thisMachine")
          : host?.label;
      return {
        key: JSON.stringify([session.hostId, session.deviceId]),
        session,
        name:
          device?.name ??
          (t
            ? t(session.platform === "ios" ? "devicePreview.iosName" : "devicePreview.androidName")
            : session.platform === "ios"
              ? "iOS Simulator"
              : "Android Emulator"),
        description: [device?.version, hostLabel].filter(Boolean).join(" · "),
        serveSimOnly: host?.kind === "simlock",
      };
    });
}

export type ThreadDevicePreview = ReturnType<typeof threadDevicePreviews>[number];

export function selectedThreadDevicePreview(
  previews: ReadonlyArray<ThreadDevicePreview>,
  selectedKey: string | null,
) {
  return previews.find((preview) => preview.key === selectedKey) ?? previews[0] ?? null;
}
