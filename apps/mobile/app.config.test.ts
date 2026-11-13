import { DEFAULT_HOSTED_APP_URL } from "@t3tools/shared/connectAuth";
import { afterEach, expect, it, vi } from "vite-plus/test";

import appleAppSiteAssociation from "../web/public/.well-known/apple-app-site-association.json";
import assetLinks from "../web/public/.well-known/assetlinks.json";

// Keep config parsing independent of local env files and build credentials.
vi.mock("../../scripts/lib/public-config.ts", () => ({
  loadRepoEnv: () => ({
    APP_VARIANT: process.env.APP_VARIANT,
    T3CODE_COMMUNITY_ANDROID: process.env.T3CODE_COMMUNITY_ANDROID,
    T3CODE_COMMUNITY_VERSION_CODE: process.env.T3CODE_COMMUNITY_VERSION_CODE,
    T3CODE_MOBILE_UPDATES_ENABLED: process.env.T3CODE_MOBILE_UPDATES_ENABLED,
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

it("isolates community Android identity and never inherits official OTA or verified links", async () => {
  vi.stubEnv("T3CODE_COMMUNITY_ANDROID", "1");
  vi.stubEnv("T3CODE_COMMUNITY_VERSION_CODE", "2");
  vi.stubEnv("T3CODE_MOBILE_UPDATES_ENABLED", "1");
  const config = await loadConfig("preview");
  expect(config.platforms).toEqual(["android"]);
  expect(config.android?.package).toBe("io.github.wuwei0727.t3code.zh");
  expect(config.scheme).toBe("t3code-zh");
  expect(config.android?.versionCode).toBe(2);
  expect(config.version).toBe("2.3.0-zh.2");
  expect(config.updates).toEqual({ enabled: false });
  expect(config.runtimeVersion).toEqual({ policy: "appVersion" });
  expect(config.android?.intentFilters).toEqual([
    {
      action: "VIEW",
      autoVerify: false,
      data: [
        { scheme: "https", host: new URL(DEFAULT_HOSTED_APP_URL).host, pathPrefix: "/threads/" },
      ],
      category: ["BROWSABLE", "DEFAULT"],
    },
  ]);
  expect(config.extra?.eas.projectId).toBeUndefined();
  expect(config.owner).toBeUndefined();
  expect(config.plugins).toContain("./plugins/withoutCommunityObserve.cjs");
});

it.each(["0", "-1", "NaN", "1.5", "2100000001"])(
  "rejects invalid community version code %s",
  async (value) => {
    vi.stubEnv("T3CODE_COMMUNITY_ANDROID", "1");
    vi.stubEnv("T3CODE_COMMUNITY_VERSION_CODE", value);
    await expect(loadConfig("preview")).rejects.toThrow("T3CODE_COMMUNITY_VERSION_CODE");
  },
);

async function loadConfig(variant: string | undefined) {
  vi.resetModules();
  vi.stubEnv("APP_VARIANT", variant);
  return (await import("./app.config.ts")).default;
}

it.each(["prod", ""])("rejects APP_VARIANT=%j before selecting production IDs", async (value) => {
  await expect(loadConfig(value)).rejects.toThrow(
    "APP_VARIANT must be development, preview, or production.",
  );
});

it.each([
  [undefined, "com.t3tools.t3code"],
  ["development", "com.t3tools.t3code.dev"],
  ["preview", "com.t3tools.t3code.preview"],
  ["production", "com.t3tools.t3code"],
])("keeps the iOS and Android identifiers for APP_VARIANT=%j", async (value, identifier) => {
  const config = await loadConfig(value);
  expect(config.ios?.bundleIdentifier).toBe(identifier);
  expect(config.android?.package).toBe(identifier);
  expect(config.plugins).not.toContain("./plugins/withoutCommunityObserve.cjs");
  // Copied thread links open this app only while app.t3.codes lists it.
  const host = new URL(DEFAULT_HOSTED_APP_URL).host;
  expect(config.ios?.associatedDomains).toContain(`applinks:${host}`);
  expect(appleAppSiteAssociation.applinks.details[0]?.appIDs).toContain(
    `${config.ios?.appleTeamId}.${identifier}`,
  );
  expect(config.android?.intentFilters?.[0]?.data).toEqual([
    { scheme: "https", host, pathPrefix: "/threads/" },
  ]);
  expect(assetLinks.map((link) => link.target.package_name)).toContain(identifier);
});
