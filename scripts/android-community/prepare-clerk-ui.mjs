import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeCrypto from "node:crypto";
import * as NodeChildProcess from "node:child_process";
import * as NodeURL from "node:url";
import { generateRuntimeCatalog } from "./generate-runtime.mjs";

export const CLERK_COMMIT = "f152db19e2999011c1008d3af465d2268915b39d";
export const ARCHIVE_SHA256 = "f96b42d80fa0b4fd657000161e0ece11a0e9f9d81933fb483c67c9144896a660";
export const OAUTH_REDIRECT = "clerk://com.t3tools.t3code.callback";
const here = NodePath.dirname(NodeURL.fileURLToPath(import.meta.url));
const sha = (bytes) => NodeCrypto.createHash("sha256").update(bytes).digest("hex");

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2)
    throw new Error(
      "Clerk UI source changed; review the OAuth/localization integration before building",
    );
  return source.replace(before, after);
}

export function patchClerkUiSources(viewModel, effects) {
  const redirect = `redirectUrl = "${OAUTH_REDIRECT}"`;
  viewModel = replaceOnce(
    viewModel,
    "Clerk.auth.signUpWithOAuth(provider = provider, unsafeMetadata = unsafeMetadata)",
    `Clerk.auth.signUpWithOAuth(provider = provider, unsafeMetadata = unsafeMetadata, ${redirect})`,
  );
  viewModel = replaceOnce(
    viewModel,
    "Clerk.auth.signInWithOAuth(provider = provider, transferable = transferable)",
    `Clerk.auth.signInWithOAuth(provider = provider, transferable = transferable, ${redirect})`,
  );
  effects = replaceOnce(
    effects,
    "  val snackbarScope = rememberCoroutineScope()",
    "  val redirectExplanation = stringResource(R.string.community_auth_redirect_not_allowed)\n  val snackbarScope = rememberCoroutineScope()",
  );
  effects = replaceOnce(
    effects,
    "LaunchedEffect(state, defaultErrorMessage)",
    "LaunchedEffect(state, defaultErrorMessage, redirectExplanation)",
  );
  effects = replaceOnce(
    effects,
    "val msg = state.message ?: defaultErrorMessage",
    "val msg = communityAuthError(state.message, defaultErrorMessage, redirectExplanation)",
  );
  return { viewModel, effects };
}

export function patchClerkOAuthEntryPoints({ signInRedirect, connectedAccount, authView }) {
  const redirect = `redirectUrl = "${OAUTH_REDIRECT}"`;
  return {
    signInRedirect: replaceOnce(
      signInRedirect,
      "signIn.authenticateWithOAuth(provider = provider, transferable = transferable)",
      `signIn.authenticateWithOAuth(provider = provider, transferable = transferable, ${redirect})`,
    ),
    connectedAccount: replaceOnce(
      connectedAccount,
      "User.CreateExternalAccountParams(provider = provider)",
      `User.CreateExternalAccountParams(provider = provider, ${redirect})`,
    ),
    authView: replaceOnce(
      authView,
      "preferGoogleOneTap: Boolean = true",
      "preferGoogleOneTap: Boolean = false",
    ),
  };
}

function inventory(root) {
  const files = {};
  function walk(dir) {
    for (const entry of NodeFS.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "build" || entry.name === "origin.json") continue;
      const p = NodePath.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else files[NodePath.relative(root, p).replaceAll("\\", "/")] = sha(NodeFS.readFileSync(p));
    }
  }
  walk(root);
  return files;
}

export async function prepareClerkUi(repoRoot) {
  if (generateRuntimeCatalog(repoRoot, true).changed)
    throw new Error("Regenerate community resources before preparing Clerk UI");
  const runtime = JSON.parse(
    NodeFS.readFileSync(NodePath.join(repoRoot, "apps/mobile/src/i18n/messages.generated.json")),
  );
  const key = "auth.error.redirectNotAllowed";
  if (!runtime.en[key]) throw new Error("Missing native auth error resource");
  const messages = {
    values: runtime.en[key],
    "values-zh-rCN": runtime.zhCN[key] ?? runtime.en[key],
  };
  const nativeResources = JSON.parse(
    NodeFS.readFileSync(NodePath.join(here, "clerk-ui", "resources.json"), "utf8"),
  );
  const inputs = [
    NodeFS.readFileSync(NodeURL.fileURLToPath(import.meta.url)),
    Buffer.from(JSON.stringify(messages)),
    Buffer.from(JSON.stringify(nativeResources)),
    Buffer.from(
      JSON.stringify(
        Object.values(nativeResources).map((id) => [runtime.en[id], runtime.zhCN[id]]),
      ),
    ),
    ...["build.gradle", "CommunityAuthError.kt", "CommunityAuthErrorTest.kt"].map((f) =>
      NodeFS.readFileSync(NodePath.join(here, "clerk-ui", f)),
    ),
  ];
  const revision = sha(Buffer.concat(inputs)).slice(0, 16);
  const cacheRoot = NodePath.join(repoRoot, ".t3", "clerk-ui");
  const destination = NodePath.join(cacheRoot, revision);
  const recordPath = NodePath.join(destination, "origin.json");
  if (NodeFS.existsSync(recordPath)) {
    const record = JSON.parse(NodeFS.readFileSync(recordPath));
    if (
      record.commit !== CLERK_COMMIT ||
      record.archiveSha256 !== ARCHIVE_SHA256 ||
      JSON.stringify(record.files) !== JSON.stringify(inventory(destination))
    )
      throw new Error("Prepared Clerk UI differs from its verified source inventory");
    return destination;
  }
  if (NodeFS.existsSync(destination))
    throw new Error("Incomplete Clerk preparation; inspect preserved directory before retrying");
  NodeFS.mkdirSync(cacheRoot, { recursive: true });
  const archive = NodePath.join(cacheRoot, `${CLERK_COMMIT}.tar.gz`);
  if (!NodeFS.existsSync(archive)) {
    const response = await fetch(
      `https://codeload.github.com/clerk/clerk-android/tar.gz/${CLERK_COMMIT}`,
      { signal: AbortSignal.timeout(120000), redirect: "error" },
    );
    if (!response.ok) throw new Error(`Clerk source download failed: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 64 * 1024 * 1024 || sha(bytes) !== ARCHIVE_SHA256)
      throw new Error("Clerk archive checksum mismatch");
    NodeFS.writeFileSync(archive, bytes);
  }
  if (sha(NodeFS.readFileSync(archive)) !== ARCHIVE_SHA256)
    throw new Error("Cached Clerk archive checksum mismatch");
  const extraction = NodeFS.mkdtempSync(NodePath.join(cacheRoot, "extract-"));
  NodeChildProcess.execFileSync("tar", ["-xzf", archive, "-C", extraction], { stdio: "pipe" });
  const upstream = NodePath.join(extraction, `clerk-android-${CLERK_COMMIT}`);
  const ui = NodePath.join(upstream, "source", "ui");
  NodeFS.mkdirSync(destination);
  NodeFS.cpSync(NodePath.join(ui, "src", "main"), NodePath.join(destination, "src", "main"), {
    recursive: true,
  });
  const licenseAsset = NodePath.join(
    destination,
    "src/main/assets/third-party/clerk-android-ui-LICENSE.txt",
  );
  NodeFS.mkdirSync(NodePath.dirname(licenseAsset), { recursive: true });
  NodeFS.copyFileSync(NodePath.join(upstream, "LICENSE"), licenseAsset);
  for (const [from, to] of [
    [NodePath.join(upstream, "LICENSE"), "LICENSE"],
    [NodePath.join(ui, "consumer-rules.pro"), "consumer-rules.pro"],
    [NodePath.join(here, "clerk-ui", "build.gradle"), "build.gradle"],
    [
      NodePath.join(here, "clerk-ui", "CommunityAuthError.kt"),
      "src/main/java/com/clerk/ui/auth/CommunityAuthError.kt",
    ],
    [
      NodePath.join(here, "clerk-ui", "CommunityAuthErrorTest.kt"),
      "src/test/java/com/clerk/ui/auth/CommunityAuthErrorTest.kt",
    ],
  ]) {
    NodeFS.mkdirSync(NodePath.dirname(NodePath.join(destination, to)), { recursive: true });
    NodeFS.copyFileSync(from, NodePath.join(destination, to));
  }
  const auth = NodePath.join(destination, "src/main/java/com/clerk/ui/auth");
  const result = patchClerkUiSources(
    NodeFS.readFileSync(NodePath.join(auth, "AuthStartViewModel.kt"), "utf8"),
    NodeFS.readFileSync(NodePath.join(auth, "AuthStateEffects.kt"), "utf8"),
  );
  NodeFS.writeFileSync(NodePath.join(auth, "AuthStartViewModel.kt"), result.viewModel);
  NodeFS.writeFileSync(NodePath.join(auth, "AuthStateEffects.kt"), result.effects);
  const entryFiles = {
    signInRedirect: "src/main/java/com/clerk/ui/signin/SignInRedirect.kt",
    connectedAccount:
      "src/main/java/com/clerk/ui/userprofile/connectedaccount/AddConnectedAccountViewModel.kt",
    authView: "src/main/java/com/clerk/ui/auth/AuthView.kt",
  };
  const entries = Object.fromEntries(
    Object.entries(entryFiles).map(([key, file]) => [
      key,
      NodeFS.readFileSync(NodePath.join(destination, file), "utf8"),
    ]),
  );
  for (const [key, content] of Object.entries(patchClerkOAuthEntryPoints(entries))) {
    NodeFS.writeFileSync(NodePath.join(destination, entryFiles[key]), content);
  }
  for (const [locale, message] of Object.entries(messages)) {
    const folder = NodePath.join(destination, "src/main/res", locale);
    NodeFS.mkdirSync(folder, { recursive: true });
    NodeFS.writeFileSync(
      NodePath.join(folder, "community-auth.xml"),
      `<resources><string name="community_auth_redirect_not_allowed">${message.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("'", "\\'").replaceAll('"', '\\"')}</string></resources>\n`,
    );
  }
  const englishXml = NodeFS.readFileSync(
    NodePath.join(destination, "src/main/res/values/strings.xml"),
    "utf8",
  );
  const escapeXml = (text) =>
    text
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("'", "\\'")
      .replaceAll('"', '\\"');
  const translatedResources = Object.entries(nativeResources).map(([name, id]) => {
    if (!englishXml.includes(`name="${name}"`) || typeof runtime.en[id] !== "string") {
      throw new Error(`Missing Clerk native resource ${name}`);
    }
    return `    <string name="${name}">${escapeXml(runtime.zhCN[id] ?? runtime.en[id])}</string>`;
  });
  NodeFS.writeFileSync(
    NodePath.join(destination, "src/main/res/values-zh-rCN/community-translations.xml"),
    `<resources>\n${translatedResources.join("\n")}\n</resources>\n`,
  );
  NodeFS.writeFileSync(
    recordPath,
    JSON.stringify(
      {
        commit: CLERK_COMMIT,
        archiveSha256: ARCHIVE_SHA256,
        oauthRedirect: OAUTH_REDIRECT,
        files: inventory(destination),
      },
      null,
      2,
    ) + "\n",
  );
  return destination;
}

if (
  process.argv[1] &&
  NodePath.resolve(process.argv[1]) === NodeURL.fileURLToPath(import.meta.url)
) {
  const destination = await prepareClerkUi(NodePath.resolve(here, "../.."));
  console.log(JSON.stringify({ prepared: destination, sourceCommit: CLERK_COMMIT }));
}
