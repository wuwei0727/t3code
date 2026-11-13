import { afterEach, expect, it, vi } from "vite-plus/test";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock("expo-constants");
  vi.doUnmock("expo-observe");
});

it.each([undefined, null, {}, ""])(
  "starts without loading native telemetry when EAS project ID is %j",
  async (projectId) => {
    vi.resetModules();
    vi.stubGlobal("__DEV__", false);
    vi.doMock("expo-constants", () => ({
      default: {
        expoConfig: { extra: { eas: { projectId }, relay: { url: "https://relay.example" } } },
      },
    }));
    vi.doMock("expo-observe", () => {
      throw new Error("Native telemetry requires an EAS project ID");
    });
    const reporting = await import("./observe");
    expect(reporting.crashReportingAvailable).toBe(false);
    await reporting.setCrashReportsEnabled(true);
    await reporting.reportCrashError(new Error("Local render failure"));
  },
);
