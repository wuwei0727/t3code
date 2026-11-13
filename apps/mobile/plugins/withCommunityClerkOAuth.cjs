const path = require("node:path");
const { pathToFileURL } = require("node:url");
const {
  withAndroidManifest,
  withSettingsGradle,
  withProjectBuildGradle,
} = require("expo/config-plugins");

const CALLBACK_HOST = "com.t3tools.t3code.callback";
const RECEIVER = "com.clerk.api.sso.SSOReceiverActivity";

function upsertOwnedBlock(contents, marker, endMarker, block) {
  const start = contents.indexOf(marker);
  if (start === -1) return contents + "\n" + block + "\n";
  const end = contents.indexOf(endMarker, start);
  if (end === -1)
    throw new Error("Incomplete community Clerk Gradle block; review before prebuilding");
  return contents.slice(0, start) + block + contents.slice(end + endMarker.length);
}

function configureReceiver(manifest) {
  const application = manifest.application?.[0];
  if (!application) throw new Error("Community OAuth requires an Android application manifest");
  application.activity ??= [];
  let receiver = application.activity.find((activity) => activity.$?.["android:name"] === RECEIVER);
  if (!receiver) {
    receiver = { $: { "android:name": RECEIVER, "android:exported": "true" } };
    application.activity.push(receiver);
  }
  receiver["intent-filter"] ??= [];
  if (
    !receiver["intent-filter"].some((filter) =>
      filter.data?.some(
        (data) =>
          data.$?.["android:scheme"] === "clerk" && data.$?.["android:host"] === CALLBACK_HOST,
      ),
    )
  ) {
    receiver["intent-filter"].push({
      action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
      category: [
        { $: { "android:name": "android.intent.category.DEFAULT" } },
        { $: { "android:name": "android.intent.category.BROWSABLE" } },
      ],
      data: [{ $: { "android:scheme": "clerk", "android:host": CALLBACK_HOST } }],
    });
  }
  return manifest;
}

module.exports = function withCommunityClerkOAuth(config) {
  config = withAndroidManifest(config, (next) => {
    next.modResults.manifest = configureReceiver(next.modResults.manifest);
    return next;
  });
  config = withSettingsGradle(config, async (next) => {
    const repoRoot = path.resolve(next.modRequest.projectRoot, "../..");
    const { prepareClerkUi } = await import(
      pathToFileURL(path.join(repoRoot, "scripts/android-community/prepare-clerk-ui.mjs")).href
    );
    const prepared = await prepareClerkUi(repoRoot);
    const relative = path
      .relative(next.modRequest.platformProjectRoot, prepared)
      .replaceAll("\\", "/");
    const marker = "// Community Clerk UI source";
    const endMarker = "// End community Clerk UI source";
    const block = `${marker}\nif (System.getenv('T3CODE_COMMUNITY_ANDROID') == '1') {\n  include ':community-clerk-ui'\n  project(':community-clerk-ui').projectDir = new File(settingsDir, '${relative}')\n}\n${endMarker}`;
    next.modResults.contents = upsertOwnedBlock(next.modResults.contents, marker, endMarker, block);
    return next;
  });
  return withProjectBuildGradle(config, (next) => {
    const marker = "// Community Clerk UI substitution";
    const endMarker = "// End community Clerk UI substitution";
    const block = `${marker}\nif (System.getenv('T3CODE_COMMUNITY_ANDROID') == '1') {\n  allprojects {\n    configurations.configureEach {\n      resolutionStrategy.dependencySubstitution {\n        all { dependency ->\n          def requested = dependency.requested\n          if (requested instanceof org.gradle.api.artifacts.component.ModuleComponentSelector && requested.group == 'com.clerk' && requested.module == 'clerk-android-ui') {\n            if (requested.version != '1.4.1') throw new GradleException('Review community Clerk UI patches before changing the SDK version')\n            dependency.useTarget(project(':community-clerk-ui'))\n          }\n        }\n      }\n    }\n  }\n}\ngradle.projectsEvaluated {\n  def appIdentity = rootProject.findProject(':app')?.extensions?.findByName('android')?.defaultConfig?.applicationId\n  if (appIdentity == 'io.github.wuwei0727.t3code.zh' && System.getenv('T3CODE_COMMUNITY_ANDROID') != '1') {\n    throw new GradleException('Community APK builds require T3CODE_COMMUNITY_ANDROID=1 during prebuild and Gradle execution')\n  }\n}\n${endMarker}`;
    next.modResults.contents = upsertOwnedBlock(next.modResults.contents, marker, endMarker, block);
    return next;
  });
};
module.exports.configureReceiver = configureReceiver;
