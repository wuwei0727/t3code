import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeUtil from "node:util";
import * as NodeURL from "node:url";

const publicKeys = [
  "T3CODE_CLERK_PUBLISHABLE_KEY",
  "T3CODE_CLERK_JWT_TEMPLATE",
  "T3CODE_CLERK_CLI_OAUTH_CLIENT_ID",
  "T3CODE_RELAY_URL",
];

export function configureConnect(root = process.cwd()) {
  const target = NodePath.join(root, ".env");
  if (NodeFS.existsSync(target)) return { created: false, existingConfigurationPreserved: true };
  const example = NodeUtil.parseEnv(
    NodeFS.readFileSync(NodePath.join(root, ".env.example"), "utf8"),
  );
  for (const key of publicKeys) {
    if (!example[key]?.trim()) throw new Error(`Upstream public configuration missing: ${key}`);
  }
  if (!example.T3CODE_CLERK_PUBLISHABLE_KEY.startsWith("pk_"))
    throw new Error("Expected a public Clerk publishable key");
  if (new URL(example.T3CODE_RELAY_URL).protocol !== "https:")
    throw new Error("Expected an HTTPS relay URL");
  const content = publicKeys.map((key) => `${key}=${JSON.stringify(example[key])}`).join("\n");
  NodeFS.writeFileSync(target, `${content}\n`, { flag: "wx" });
  return { created: true, source: ".env.example", publicKeys };
}

export function validateConnectExtra(extra) {
  for (const [key, value] of [
    ["clerk.publishableKey", extra?.clerk?.publishableKey],
    ["clerk.jwtTemplate", extra?.clerk?.jwtTemplate],
    ["relay.url", extra?.relay?.url],
  ]) {
    if (typeof value !== "string" || !value.trim())
      throw new Error(`Community APK would hide account/Connect entries: missing ${key}`);
  }
  if (!extra.clerk.publishableKey.startsWith("pk_")) throw new Error("Invalid publishable key");
  if (new URL(extra.relay.url).protocol !== "https:") throw new Error("Expected an HTTPS relay");
  return { cloudPublicConfiguration: "present", authentication: "not verified" };
}

if (
  process.argv[1] &&
  import.meta.url === NodeURL.pathToFileURL(NodePath.resolve(process.argv[1])).href
) {
  const args = process.argv.slice(2);
  if (args.length === 0) console.log(JSON.stringify(configureConnect()));
  else if (args.length === 2 && args[0] === "--check-expo-config") {
    const config = JSON.parse(NodeFS.readFileSync(args[1], "utf8"));
    console.log(JSON.stringify(validateConnectExtra(config.extra)));
  } else throw new Error("Use configure-connect.mjs [--check-expo-config <JSON file>]");
}
